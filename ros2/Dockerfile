FROM ros:jazzy-ros-base
RUN apt-get update && apt-get install -y --no-install-recommends \
    ros-jazzy-nav2-msgs python3-colcon-common-extensions python3-websockets python3-pytest \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /ws
COPY ros2/nodeai_bridge /ws/src/nodeai_bridge
RUN . /opt/ros/jazzy/setup.sh && colcon build --symlink-install
ENV ROS_DOMAIN_ID=97
CMD ["bash", "-lc", "source /opt/ros/jazzy/setup.bash && source /ws/install/setup.bash && python3 -m pytest -q src/nodeai_bridge/test"]
