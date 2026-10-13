from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "config_path",
                default_value=PathJoinSubstitution(
                    [FindPackageShare("nodeai_bridge"), "config", "robots.json"]
                ),
            ),
            Node(
                package="nodeai_bridge",
                executable="bridge",
                output="screen",
                parameters=[{"config_path": LaunchConfiguration("config_path")}],
            ),
        ]
    )
