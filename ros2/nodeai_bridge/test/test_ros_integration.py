"""Exercise real rclpy/Nav2 action messages without requiring robot hardware."""

import asyncio
import json
import threading
import time
import pytest

rclpy = pytest.importorskip("rclpy")
from rclpy.action import ActionServer, CancelResponse, GoalResponse
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.executors import (
    MultiThreadedExecutor,
    SingleThreadedExecutor,
    ExternalShutdownException,
)
from rclpy.node import Node
from rclpy.parameter import Parameter
from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy
from geometry_msgs.msg import PoseWithCovarianceStamped
from sensor_msgs.msg import BatteryState
from nav2_msgs.action import NavigateToPose
from websockets.legacy.client import connect
from websockets.exceptions import InvalidStatusCode
from nodeai_bridge.node import BridgeNode, socket_server


def wait_for(predicate, seconds=8):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.02)
    raise AssertionError("Timed out waiting for ROS state")


def spin(executor):
    try:
        executor.spin()
    except ExternalShutdownException:
        pass


@pytest.fixture
def bridge():
    rclpy.init()
    server_node = Node("nodeai_test_nav2")
    observed = []

    def execute(handle):
        observed.append(handle.request.pose)
        hold = handle.request.pose.pose.position.x == 3.0
        for _ in range(200 if hold else 4):
            if handle.is_cancel_requested:
                handle.canceled()
                return NavigateToPose.Result()
            feedback = NavigateToPose.Feedback()
            feedback.distance_remaining = 1.0
            handle.publish_feedback(feedback)
            time.sleep(0.02)
        handle.succeed()
        return NavigateToPose.Result()

    server = ActionServer(
        server_node,
        NavigateToPose,
        "/test/navigate_to_pose",
        execute_callback=execute,
        callback_group=ReentrantCallbackGroup(),
        goal_callback=lambda goal: (
            GoalResponse.REJECT
            if goal.pose.pose.position.x < 0
            else GoalResponse.ACCEPT
        ),
        cancel_callback=lambda _goal: CancelResponse.ACCEPT,
    )
    qos = QoSProfile(
        depth=1,
        reliability=ReliabilityPolicy.RELIABLE,
        durability=DurabilityPolicy.TRANSIENT_LOCAL,
    )
    pose_pub = server_node.create_publisher(
        PoseWithCovarianceStamped, "/test/amcl_pose", qos
    )
    battery_pub = server_node.create_publisher(BatteryState, "/test/battery_state", 5)
    settings = {
        "port": 8766,
        "robots": [
            {
                "id": "agv1",
                "action": "/test/navigate_to_pose",
                "pose_topic": "/test/amcl_pose",
                "battery_topic": "/test/battery_state",
                "frame_id": "map",
            }
        ],
    }
    events = []
    node = BridgeNode(settings, events.append)
    bridge_executor, server_executor = (
        SingleThreadedExecutor(),
        MultiThreadedExecutor(num_threads=2),
    )
    bridge_executor.add_node(node)
    server_executor.add_node(server_node)
    threads = [
        threading.Thread(target=spin, args=(executor,), daemon=True)
        for executor in [bridge_executor, server_executor]
    ]
    for thread in threads:
        thread.start()
    pose = PoseWithCovarianceStamped()
    pose.header.frame_id = "map"
    pose.pose.pose.orientation.w = 1.0
    pose.pose.pose.position.x = 0.5
    battery = BatteryState()
    battery.percentage = 0.8
    pose_pub.publish(pose)
    wait_for(lambda: node.ports["agv1"].pose is not None)
    battery_pub.publish(battery)
    wait_for(
        lambda: (
            node.ports["agv1"].ready()
            and node.ports["agv1"].battery == pytest.approx(0.8)
        )
    )
    try:
        yield node, events, observed
    finally:
        rclpy.shutdown()
        for thread in threads:
            thread.join(timeout=3)
        server.destroy()
        node.destroy_node()
        server_node.destroy_node()


def request(request_id, x):
    return {
        "version": 1,
        "type": "navigate",
        "request_id": request_id,
        "robot_id": "agv1",
        "target": {"x": x, "y": 2, "yaw": 1.2},
    }


def state(events, request_id, expected):
    return any(
        e.get("request_id") == request_id and e.get("state") == expected for e in events
    )


def test_real_action_goal_feedback_result_and_telemetry(bridge):
    node, events, observed = bridge
    node.commands.put(request("success", 1))
    wait_for(lambda: state(events, "success", "succeeded"))
    assert state(events, "success", "accepted") and state(events, "success", "running")
    pose = observed[0]
    assert pose.header.frame_id == "map"
    assert pose.pose.position.x == 1 and pose.pose.position.y == 2
    assert pose.pose.orientation.z == pytest.approx(__import__("math").sin(0.6))
    assert node.ports["agv1"].pose["x"] == 0.5
    assert node.ports["agv1"].battery == pytest.approx(0.8)


def test_real_rejection_and_cancellation(bridge):
    node, events, _ = bridge
    node.commands.put(request("reject", -1))
    wait_for(lambda: state(events, "reject", "rejected"))
    node.commands.put(request("cancel-target", 3))
    wait_for(lambda: state(events, "cancel-target", "accepted"))
    node.commands.put(
        {
            "version": 1,
            "type": "cancel",
            "request_id": "cancel",
            "robot_id": "agv1",
            "target_request_id": "cancel-target",
        }
    )
    wait_for(lambda: state(events, "cancel-target", "cancelled"))
    assert not node.gateway.active


def test_websocket_command_reaches_real_ros_action(bridge):
    node, events, _ = bridge
    # Use the real transport queue for this test, not a substitute serializer.
    node.emit = node.publish_event
    node.gateway.emit = node.publish_event
    thread = threading.Thread(
        target=lambda: asyncio.run(socket_server(node)), daemon=True
    )
    thread.start()

    async def scenario():
        for _ in range(50):
            try:
                socket = await connect(
                    "ws://127.0.0.1:8766", origin="http://127.0.0.1:5173"
                )
                break
            except OSError:
                await asyncio.sleep(0.02)
        else:
            raise AssertionError("WebSocket did not open")
        try:
            assert json.loads(await socket.recv())["type"] == "hello"
            await socket.send(json.dumps(request("socket-goal", 1)))

            async def completed():
                while True:
                    data = json.loads(await socket.recv())
                    if (
                        data.get("request_id") == "socket-goal"
                        and data.get("state") == "succeeded"
                    ):
                        return

            await asyncio.wait_for(completed(), timeout=8)
            with pytest.raises(InvalidStatusCode) as denied:
                await connect("ws://127.0.0.1:8766", origin="https://untrusted.example")
            assert denied.value.status_code == 403
        finally:
            await socket.close()

    asyncio.run(scenario())
    # The fixture shuts down rclpy, which exits the transport loop.


def test_paused_simulation_clock_does_not_block_cancellation(bridge):
    node, events, _ = bridge
    node.commands.put(request("paused-clock", 3))
    wait_for(lambda: state(events, "paused-clock", "accepted"))
    changed = node.set_parameters([Parameter("use_sim_time", value=True)])
    assert changed[0].successful
    assert node.get_clock().now().nanoseconds == 0
    node.commands.put(
        {
            "version": 1,
            "type": "cancel",
            "request_id": "clock-cancel",
            "robot_id": "agv1",
            "target_request_id": "paused-clock",
        }
    )
    wait_for(lambda: state(events, "paused-clock", "cancelled"))
    assert not node.gateway.active


def waypoint_request(identifier, xs):
    return {
        "version": 1,
        "type": "waypoints",
        "request_id": identifier,
        "robot_id": "agv1",
        "targets": [{"x": x, "y": 2, "yaw": 0} for x in xs],
    }


def test_real_waypoint_sequence_completes_in_order(bridge):
    node, events, observed = bridge
    node.commands.put(waypoint_request("route", [1, 2]))
    wait_for(lambda: state(events, "route", "succeeded"))
    assert [pose.pose.position.x for pose in observed] == [1, 2]
    assert [e for e in events if e.get("request_id") == "route"][-1][
        "completed_waypoints"
    ] == 2


def test_real_second_waypoint_rejection_fails_mission(bridge):
    node, events, observed = bridge
    node.commands.put(waypoint_request("reject-route", [1, -1, 2]))
    wait_for(lambda: state(events, "reject-route", "failed"))
    assert [pose.pose.position.x for pose in observed] == [1]
    assert [e for e in events if e.get("request_id") == "reject-route"][-1][
        "completed_waypoints"
    ] == 1


def test_real_cancelled_route_does_not_send_next_goal(bridge):
    node, events, observed = bridge
    node.commands.put(waypoint_request("cancel-route", [3, 2]))
    wait_for(lambda: state(events, "cancel-route", "accepted"))
    node.commands.put(
        {
            "version": 1,
            "type": "cancel",
            "request_id": "route-stop",
            "robot_id": "agv1",
            "target_request_id": "cancel-route",
        }
    )
    wait_for(lambda: state(events, "cancel-route", "cancelled"))
    assert [pose.pose.position.x for pose in observed] == [3]
