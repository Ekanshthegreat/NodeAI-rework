"""ROS 2 topic/action ports and a loopback WebSocket transport."""

import asyncio
import json
import math
from pathlib import Path
from queue import Empty, Full, Queue
import threading
import time

import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy
from geometry_msgs.msg import PoseWithCovarianceStamped
from nav2_msgs.action import NavigateToPose
from sensor_msgs.msg import BatteryState
from websockets.legacy.server import serve
from websockets.exceptions import ConnectionClosed

from nodeai_bridge.gateway import Gateway, identifier


class NavigationPort:
    def __init__(self, node, settings):
        self.node, self.settings = node, settings
        self.pose = self.battery = None
        self.pose_received = None
        self.battery_received = None
        self.client = ActionClient(node, NavigateToPose, settings["action"])
        # AMCL's published pose is reliable/transient-local. Battery sensor data
        # uses best-effort/volatile QoS, compatible with common sensor publishers.
        pose_qos = QoSProfile(
            depth=1,
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.TRANSIENT_LOCAL,
        )
        battery_qos = QoSProfile(depth=5, reliability=ReliabilityPolicy.BEST_EFFORT)
        self.subscriptions = [
            node.create_subscription(
                PoseWithCovarianceStamped,
                settings["pose_topic"],
                self.on_pose,
                pose_qos,
            ),
            node.create_subscription(
                BatteryState, settings["battery_topic"], self.on_battery, battery_qos
            ),
        ]

    def on_pose(self, message):
        if message.header.frame_id != self.settings["frame_id"]:
            return
        p, q = message.pose.pose.position, message.pose.pose.orientation
        values = [p.x, p.y, q.x, q.y, q.z, q.w]
        if not all(math.isfinite(x) for x in values):
            return
        norm = math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w)
        if norm < 1e-9:
            return
        x, y, z, w = q.x / norm, q.y / norm, q.z / norm, q.w / norm
        self.pose = {
            "x": p.x,
            "y": p.y,
            "yaw": math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
        }
        self.pose_received = time.monotonic()

    def on_battery(self, message):
        self.battery_received = time.monotonic()
        self.battery = (
            message.percentage
            if math.isfinite(message.percentage) and 0 <= message.percentage <= 1
            else None
        )

    def ready(self):
        fresh = (
            self.pose_received is not None
            and time.monotonic() - self.pose_received <= self.node.pose_timeout
        )
        battery_fresh = (
            self.battery_received is not None
            and time.monotonic() - self.battery_received <= self.node.pose_timeout
        )
        battery_ok = (
            self.battery is None and not self.settings.get("require_battery", False)
        ) or (battery_fresh and self.battery is not None and self.battery >= 0.2)
        return self.client.server_is_ready() and fresh and battery_ok

    def send(self, target, feedback):
        goal = NavigateToPose.Goal()
        goal.pose.header.frame_id = self.settings["frame_id"]
        goal.pose.header.stamp = self.node.get_clock().now().to_msg()
        goal.pose.pose.position.x, goal.pose.pose.position.y = (
            float(target["x"]),
            float(target["y"]),
        )
        goal.pose.pose.orientation.z = math.sin(target["yaw"] / 2)
        goal.pose.pose.orientation.w = math.cos(target["yaw"] / 2)
        # Leave behavior_tree empty: use the configured Nav2 default.
        return self.client.send_goal_async(
            goal,
            feedback_callback=lambda message: feedback(
                {"distance_remaining": float(message.feedback.distance_remaining)}
            ),
        )


class BridgeNode(Node):
    def __init__(self, settings=None, emit=None):
        super().__init__("nodeai_bridge")
        if settings is None:
            self.declare_parameter("config_path", "")
            path = self.get_parameter("config_path").value
            if not path:
                raise ValueError(
                    "config_path must point to the robot configuration JSON"
                )
            settings = json.loads(Path(path).read_text())
        self.settings = settings
        self.pose_timeout = float(settings.get("pose_timeout_seconds", 30))
        if not 1 <= self.pose_timeout <= 300:
            raise ValueError("pose_timeout_seconds must be between 1 and 300")
        if (
            not isinstance(settings.get("robots"), list)
            or not 1 <= len(settings["robots"]) <= 32
        ):
            raise ValueError("Configure 1–32 robots")
        self.commands, self.outgoing = Queue(maxsize=200), Queue(maxsize=2000)
        self.emit = emit or self.publish_event
        self.ports = {}
        for robot in settings["robots"]:
            identifier(robot["id"])
            if robot["id"] in self.ports:
                raise ValueError("Duplicate robot ID")
            for field in ["action", "pose_topic", "battery_topic", "frame_id"]:
                if not isinstance(robot.get(field), str) or not robot[field]:
                    raise ValueError(f"Robot needs {field}")
            self.ports[robot["id"]] = NavigationPort(self, robot)
        self.gateway = Gateway(self.ports, self.emit, time.monotonic)
        self.create_timer(0.02, self.process_commands)
        self.create_timer(0.5, self.heartbeat)

    def publish_event(self, event):
        try:
            self.outgoing.put_nowait(event)
        except Full:
            # A stalled transport must not block ROS callbacks. Heartbeats expose
            # current assignment after reconnect; log overflow rather than fabricate success.
            self.get_logger().error(
                "Bridge output queue full; use heartbeat to reconcile goal state"
            )

    def process_commands(self):
        for _ in range(20):
            try:
                data = self.commands.get_nowait()
            except Empty:
                break
            self.gateway.receive(data)
        self.gateway.poll()

    def heartbeat(self):
        robots = []
        for robot_id, port in self.ports.items():
            request_id = self.gateway.active.get(robot_id)
            session = self.gateway.sessions.get(request_id)
            robots.append(
                {
                    "id": robot_id,
                    "frame_id": port.settings["frame_id"],
                    "pose": port.pose,
                    "pose_age_seconds": None
                    if port.pose_received is None
                    else time.monotonic() - port.pose_received,
                    "battery": port.battery,
                    "ready": port.ready(),
                    "request_id": request_id,
                    "state": session.state if session else "idle",
                }
            )
        self.emit({"version": 1, "type": "robots", "robots": robots})


async def socket_server(node):
    clients = set()
    host, port = (
        node.settings.get("host", "127.0.0.1"),
        int(node.settings.get("port", 8765)),
    )
    fixture_forwarding = (
        node.settings.get("mode") == "test_fixture" and host == "0.0.0.0"
    )
    if (
        host not in {"127.0.0.1", "::1", "localhost"} and not fixture_forwarding
    ) or not 1024 <= port <= 65535:
        raise ValueError("Bridge requires a loopback host and port 1024–65535")
    origins = node.settings.get(
        "allowed_origins",
        [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:4173",
            "http://localhost:4173",
        ],
    )

    async def handler(socket, _path):
        if len(clients) >= 8:
            await socket.close(code=1013, reason="Bridge client limit")
            return
        clients.add(socket)
        await socket.send(
            json.dumps(
                {
                    "version": 1,
                    "type": "hello",
                    "mode": node.settings.get("mode", "ros"),
                    "robots": list(node.ports),
                }
            )
        )
        try:
            async for raw in socket:
                try:
                    data = json.loads(
                        raw,
                        parse_constant=lambda value: (_ for _ in ()).throw(
                            ValueError(value)
                        ),
                    )
                    if isinstance(data, dict):
                        request_id = identifier(data.get("request_id"))
                    node.commands.put_nowait(data)
                except (ValueError, Full):
                    await socket.send(
                        json.dumps(
                            {
                                "version": 1,
                                "type": "error",
                                "request_id": request_id,
                                "message": "Invalid JSON or command queue full",
                            }
                        )
                    )
        except ConnectionClosed:
            pass
        finally:
            clients.discard(socket)

    async def broadcast():
        while rclpy.ok():
            for _ in range(100):
                try:
                    event = node.outgoing.get_nowait()
                except Empty:
                    break
                payload = json.dumps(event, allow_nan=False)

                async def send_one(socket):
                    try:
                        await asyncio.wait_for(socket.send(payload), timeout=0.5)
                    except Exception:
                        clients.discard(socket)
                        await socket.close()

                await asyncio.gather(*(send_one(client) for client in list(clients)))
            await asyncio.sleep(0.02)

    async with serve(handler, host, port, origins=origins, max_size=8192, max_queue=16):
        node.get_logger().info(f"NodeAI bridge on ws://{host}:{port}")
        await broadcast()


def main():
    rclpy.init()
    node = BridgeNode()
    thread = threading.Thread(target=rclpy.spin, args=(node,), daemon=True)
    thread.start()
    try:
        asyncio.run(socket_server(node))
    except KeyboardInterrupt:
        pass
    finally:
        if rclpy.ok():
            rclpy.shutdown()
        thread.join(timeout=3)
        node.destroy_node()
