# ROS 2 / Nav2 integration

The v0.3.0 ROS path sends real `nav2_msgs/action/NavigateToPose` goals, subscribes
to localization and battery messages, and reports actual action feedback/results.
It does not execute the local simulator's pickup, handoff, charging or recovery
steps on a physical robot. Those need separate robot-specific handlers.

## Architecture

```mermaid
flowchart LR
  UI[ROS mission control] -->|versioned WebSocket commands| Gateway[Validated goal lifecycle]
  Gateway -->|send / cancel| Action[rclpy Nav2 action client]
  Action --> Nav2[Robot namespace / navigate_to_pose]
  Nav2 -->|acceptance / feedback / result| Gateway
  Pose[AMCL PoseWithCovarianceStamped] --> Bridge[ROS bridge node]
  Battery[BatteryState] --> Bridge
  Bridge -->|robot heartbeat| UI
  Gateway -->|navigation events| UI
```

The ROS page is `/app/ros`, separate from the local fleet executor. Nav2 owns
planning, costmaps and obstacle avoidance. The local A* planner does not issue
hardware routes. The bridge spins a single-threaded ROS executor and handles
WebSockets on a separate asyncio loop, connected through bounded queues.

## ROS host setup

Target platform: ROS 2 Jazzy on Ubuntu 24.04. Install ROS through its supported
installation process, then use a workspace with the `nodeai_bridge` package:

```sh
mkdir -p ~/nodeai_ws/src
cp -R ros2/nodeai_bridge ~/nodeai_ws/src/
cd ~/nodeai_ws
source /opt/ros/jazzy/setup.bash
rosdep install --from-paths src --ignore-src -r -y --rosdistro jazzy
colcon build --symlink-install
source install/setup.bash
ros2 launch nodeai_bridge bridge.launch.py
```

These steps presume `rosdep` and `colcon` are installed and `rosdep` has been
initialized on the ROS host. No ROS installation is needed for the browser app:
run `npm ci` and `npm run dev`, open **ROS 2**, and connect to the bridge.

Copy `ros2/nodeai_bridge/config/robots.json` to a site configuration and pass it
with `ros2 launch nodeai_bridge bridge.launch.py config_path:=/absolute/path/robots.json`.
Use `use_sim_time:=true` when Nav2 uses a simulator clock. Goal timestamps then
use ROS simulation time, while transport/cancellation deadlines and heartbeats
use a steady clock so pausing simulation does not freeze those controls.

Set each robot's namespace-specific action, localization topic, battery topic and
frame ID. The example uses `/agv1/navigate_to_pose` and `/agv2/navigate_to_pose`,
with corresponding AMCL/battery topics. It does not launch Nav2 or configure a
robot's drivers, TF tree, map, localization or costmap.

For a remote ROS host, keep the bridge loopback-only and forward its port:

```sh
ssh -N -L 8765:127.0.0.1:8765 <ros-host>
```

The browser then connects to `ws://127.0.0.1:8765`. Browser origins must match the
configuration's `allowed_origins`; add an exact development/preview origin when
using a different port. The standard configuration accepts local ports 5173 and
4173. It does not support a publicly exposed unauthenticated robot gateway.

## Telemetry and readiness

- Localization is `geometry_msgs/PoseWithCovarianceStamped` from the configured
  frame. Other frames are ignored; this package does not perform TF transforms.
- Quaternion orientation is normalized before deriving planar yaw. Non-finite
  poses and zero-length quaternions are ignored.
- AMCL uses reliable/transient-local QoS; the subscriber matches it. Battery uses
  best-effort/volatile QoS.
- Nav2 must be available and localization received within the configured
  `pose_timeout_seconds` (default 30). This measures receipt age, not a transform
  or sensor-time accuracy guarantee. Stationary AMCL systems may need periodic
  localization updates or an appropriate receipt-age limit.
- Battery percentage is 0–1, or unknown when absent/invalid. Set `require_battery`
  to `true` on a robot to reject goals until valid battery telemetry is available.
  Known battery values below 20%, or stale known readings, block new goals.
- Browser heartbeat freshness is checked separately: goals are disabled after
  three seconds without a robot heartbeat.

## Goal lifecycle

One outstanding mission is permitted per robot. A mission is one pose or a
sequence of 1–20 waypoints, executed through one NavigateToPose action at a time. A request ID identifies its exact
payload, so repeating an unchanged retained request reports its current state
without dispatching a second goal. Reusing an ID with different content is
rejected. Terminal history and cancel-request history are bounded to 256 entries;
use fresh UUIDs for new requests. This is bounded in-memory idempotence, not an
across-restart exactly-once guarantee.

States are `pending`, `accepted`, `running`, `cancelling`, `unknown`, `succeeded`,
`cancelled`, `rejected` and `failed`. `accepted` is not completion. Success
requires a terminal action success status and a zero Nav2 error code. A cancel
acknowledgement is not completion either: the robot remains occupied until its
terminal result arrives.

A goal-response timeout holds the assignment. If Nav2 later accepts that goal,
the bridge cancels it rather than resubmitting it. Each leg has its own execution timeout, requesting
cancellation at 120 seconds. Failed cancellation or missing results leave the
state unknown and the assignment held. No automatic reassignment or manual
"force idle" button is exposed in ROS mode.

Disconnecting/reloading the browser does not cancel a robot goal. Reconnect
heartbeats expose its current request so it can be explicitly cancelled. Bridge
restart loses in-memory history and cannot recover an earlier action handle;
reconcile or stop existing Nav2 goals before issuing commands after a restart.
Restart reconciliation and robot-specific non-navigation tasks remain future work.

## Waypoint lifecycle

The complete route is validated before the first action is sent. The robot stays
assigned across all legs. Each subsequent dispatch rechecks localization,
battery and action-server readiness. A later rejection or readiness failure
ends the mission as failed; no later waypoint is sent. Old feedback and result
callbacks are guarded by a per-leg generation, so they cannot change the next
leg's state. No automatic retry or robot reassignment is attempted.

Cancellation targets the parent mission ID and requests cancellation of its
current action. If that leg succeeds while cancellation is in flight, its
completion is counted but remaining legs are skipped. If the final leg already
succeeded, the mission remains succeeded. Unknown results keep the assignment
held. Navigation events and robot heartbeats report `completed_waypoints` and
`total_waypoints`; success requires completion of the entire route.

## Wire contract (version 1)

```json
{"version":1,"type":"navigate","request_id":"a-new-uuid","robot_id":"agv1","target":{"x":1.0,"y":2.0,"yaw":0.0}}
```

```json
{"version":1,"type":"cancel","request_id":"another-uuid","robot_id":"agv1","target_request_id":"a-new-uuid"}
```

```json
{"version":1,"type":"waypoints","request_id":"route-uuid","robot_id":"agv1","targets":[{"x":1.0,"y":2.0,"yaw":0.0},{"x":3.0,"y":4.0,"yaw":0.0}]}
```

The `hello` message advertises `capabilities: ["navigate", "waypoints", "cancel"]`.
The browser enables the route editor only when the bridge advertises waypoint
support. Older version-1 bridges can still handle single-pose commands.

Targets are metres and radians in the configured frame: finite X/Y values within
±10,000 and yaw within ±π. The server rejects unknown fields, robots, invalid
IDs and unsupported commands. Messages are limited to 8 KiB; client and queue
counts are bounded. Outbound messages are `hello`, `robots`, `navigation` and
`error`; `src/ros/client.ts` validates them. Transport overload is logged, and
heartbeats reconcile current assignment rather than inventing a terminal result.

The browser accepts one `hello` per connection, with unique robot IDs. A second
handshake closes the connection rather than changing its source mode or robot
identity in place. Reconnect explicitly after a bridge restart or roster change.
Commands are restricted to the advertised robots; snapshots with duplicate or
unadvertised IDs and navigation feedback for other robots are ignored. An invalid
snapshot does not refresh the heartbeat, so stale dispatch protection still applies.
Inbound bridge messages above 64 KiB of UTF-8 text close the browser connection.
This is separate from the server's 8 KiB incoming-command limit. Neither closure
automatically cancels a goal on the robot.

## Export browser observations

**Export observed events** downloads a version-1 JSON record of navigation and
error messages received on this page. Each event includes a sequence number,
UTC browser receipt time, bridge-session number and `ros` or `test_fixture`
source. The record stays available after disconnecting, until the page is left
or reloaded. It is held in memory, not browser storage or the ROS bridge.

At most 500 observations are retained. Only consecutive `running` feedback for
the same request, robot, waypoint and bridge session is coalesced; the latest
remaining distance is kept. Lifecycle changes and errors remain distinct.
Sequence gaps can represent coalesced feedback. `dropped_events` separately
counts history entries evicted at the retention limit.

Receipt times are not ROS timestamps. This export cannot reconstruct a robot's
trajectory, prove what happened during disconnection, or reconcile actions after
bridge restart. The page's shorter event list shows recent state changes; the
JSON contains the larger retained observation history.

### Inspect a saved record

From **Navigation events**, choose **Open saved observations**, or open
`/app/ros/records` (on Pages, `#/app/ros/records`). Choose the exported JSON file;
the viewer checks version, message schemas, sequence order, retention counts,
waypoint progress and source labels within each bridge session. Imports are
limited to 2 MiB and 500 events. Invalid files clear the previous record and
show an error. Files remain in page memory and are not uploaded or persisted.

Filter by bridge session before comparing reused request IDs. Robot filters
exclude protocol errors that have no robot ID; request filters retain errors
with matching request IDs. Rows remain in recorded sequence order even if the
browser wall clock moved backward. **Load example** uses illustrative fixture
events, not a physical robot run. Source labels describe the export's contents;
the viewer does not authenticate the file or its origin.

**Download filtered CSV** saves only the rows currently shown, preserving original
sequence numbers, UTC receipt times, session/source labels and request IDs.
Navigation fields include state, waypoint progress and remaining distance in
metres; protocol errors leave robot/navigation fields empty. The button is
disabled when no rows match. CSV text uses quoting for embedded commas/newlines,
and formula-like text is prefixed with an apostrophe for spreadsheet use. This
does not modify the original JSON. CSV files are inspection extracts, not a
format the JSON viewer imports.

This page does not initialize the simulation store, create a bridge client or
send commands. It displays observations only, without reconstructing positions,
inferring missing transitions or claiming the final state is still current.

## Run the actual ROS tests without hardware

```sh
docker build -f ros2/Dockerfile -t nodeai-ros-test .
docker run --rm nodeai-ros-test
```

The official ROS Jazzy image builds the package with `colcon`. The suite contains
23 pure lifecycle tests and seven integration tests using real rclpy action
clients/servers, Nav2 messages and the WebSocket transport. It checks frame/goal
construction, telemetry, feedback, success, rejection, cancellation and denied
browser origins, sequential route completion, later rejection and cancellation. These tests use a fixture action server; they are not a full
Nav2 navigation-stack, Gazebo, hardware or collision-avoidance validation.

## Browser demonstration fixture

The fixture publishes synthetic localization/battery data and serves real ROS
navigation actions. The browser labels it **ROS 2 action test fixture**. It is
separate from the production bridge configuration.

```sh
docker run --rm -p 127.0.0.1:8767:8765 nodeai-ros-test bash -lc \
  'source /opt/ros/jazzy/setup.bash && source /ws/install/setup.bash && python3 /ws/src/nodeai_bridge/test/demo_nav2.py'
npm run dev -- --host 127.0.0.1 --port 4185
```

Open `/app/ros` on port 4185 and connect to `ws://127.0.0.1:8767`. Positive-X goals
succeed after a short fixture delay; negative-X goals are deliberately rejected.
Cancel an active goal to inspect the full cancellation lifecycle. This fixture
can bind inside its container for Docker port forwarding; the host mapping
remains loopback-only. Ordinary ROS mode requires a loopback listener.

## Primary interface sources

- [Jazzy NavigateToPose action definition](https://github.com/ros-navigation/navigation2/blob/jazzy/nav2_msgs/action/NavigateToPose.action)
- [Jazzy rclpy action client](https://github.com/ros2/rclpy/blob/jazzy/rclpy/rclpy/action/client.py)
- [Jazzy AMCL publisher/QoS](https://github.com/ros-navigation/navigation2/blob/jazzy/nav2_amcl/src/amcl_node.cpp)
- [BatteryState message](https://github.com/ros2/common_interfaces/blob/jazzy/sensor_msgs/msg/BatteryState.msg)

![ROS navigation page connected to the action test fixture](images/ros-waypoints.png)
