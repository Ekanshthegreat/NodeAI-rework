"""Browser demo fixture using real ROS actions and synthetic poses; no robot hardware."""

import asyncio
import threading
import time
import rclpy
from rclpy.node import Node
from rclpy.action import ActionServer, GoalResponse, CancelResponse
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.executors import (
    MultiThreadedExecutor,
    SingleThreadedExecutor,
    ExternalShutdownException,
)
from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy
from geometry_msgs.msg import PoseWithCovarianceStamped
from sensor_msgs.msg import BatteryState
from nav2_msgs.action import NavigateToPose
from nodeai_bridge.node import BridgeNode, socket_server


def main():
    rclpy.init()
    fixture = Node("nodeai_demo_fixture")
    settings = {
        "host": "0.0.0.0",
        "port": 8765,
        "mode": "test_fixture",
        "allowed_origins": [
            "http://127.0.0.1:4185",
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:4173",
        ],
        "robots": [],
    }
    servers, publishers, poses = [], [], {}
    group = ReentrantCallbackGroup()
    qos = QoSProfile(
        depth=1,
        reliability=ReliabilityPolicy.RELIABLE,
        durability=DurabilityPolicy.TRANSIENT_LOCAL,
    )
    for robot_id in ["agv1", "agv2"]:
        settings["robots"].append(
            {
                "id": robot_id,
                "action": f"/{robot_id}/navigate_to_pose",
                "pose_topic": f"/{robot_id}/amcl_pose",
                "battery_topic": f"/{robot_id}/battery_state",
                "frame_id": "map",
            }
        )
        pose = PoseWithCovarianceStamped()
        pose.header.frame_id = "map"
        pose.pose.pose.orientation.w = 1.0
        poses[robot_id] = pose
        publishers.append(
            (
                robot_id,
                fixture.create_publisher(
                    PoseWithCovarianceStamped, f"/{robot_id}/amcl_pose", qos
                ),
                fixture.create_publisher(BatteryState, f"/{robot_id}/battery_state", 5),
            )
        )

        def execute(handle, robot=robot_id):
            for _ in range(30):
                if handle.is_cancel_requested:
                    handle.canceled()
                    return NavigateToPose.Result()
                feedback = NavigateToPose.Feedback()
                feedback.distance_remaining = 1.0
                handle.publish_feedback(feedback)
                time.sleep(0.1)
            poses[robot].pose.pose = handle.request.pose.pose
            handle.succeed()
            return NavigateToPose.Result()

        servers.append(
            ActionServer(
                fixture,
                NavigateToPose,
                f"/{robot_id}/navigate_to_pose",
                execute_callback=execute,
                callback_group=group,
                goal_callback=lambda goal: (
                    GoalResponse.REJECT
                    if goal.pose.pose.position.x < 0
                    else GoalResponse.ACCEPT
                ),
                cancel_callback=lambda _goal: CancelResponse.ACCEPT,
            )
        )

    def publish():
        for robot, pose_pub, battery_pub in publishers:
            poses[robot].header.stamp = fixture.get_clock().now().to_msg()
            pose_pub.publish(poses[robot])
            battery = BatteryState()
            battery.percentage = 0.8
            battery_pub.publish(battery)

    fixture.create_timer(0.5, publish, callback_group=group)
    bridge = BridgeNode(settings)
    executors = [SingleThreadedExecutor(), MultiThreadedExecutor(num_threads=4)]
    executors[0].add_node(bridge)
    executors[1].add_node(fixture)

    def spin(executor):
        try:
            executor.spin()
        except ExternalShutdownException:
            pass

    threads = [
        threading.Thread(target=spin, args=(executor,), daemon=True)
        for executor in executors
    ]
    for thread in threads:
        thread.start()
    try:
        asyncio.run(socket_server(bridge))
    except KeyboardInterrupt:
        pass
    finally:
        if rclpy.ok():
            rclpy.shutdown()
        for thread in threads:
            thread.join(timeout=3)
        bridge.destroy_node()
        fixture.destroy_node()


if __name__ == "__main__":
    main()
