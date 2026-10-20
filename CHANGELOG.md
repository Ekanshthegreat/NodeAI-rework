# Changelog

## Unreleased

- Download filtered ROS observations as CSV with original event identity, explicit units and spreadsheet-safe text.

- Open saved ROS observation JSON offline, with bounded validation and session/robot/request filters.
- Include an explicitly labeled fixture example; imported records do not connect to ROS or modify the fleet.

- Keep one handshake and robot roster per browser bridge connection; reject duplicate identities and foreign feedback.
- Bound inbound bridge messages by UTF-8 size and preserve the current connection when an invalid address is entered.

- Download bounded ROS observation records with browser timestamps, per-connection provenance and explicit history limits.
- Show remaining distance from actual Nav2 feedback; preserve lifecycle events while coalescing consecutive feedback.

- Validate every saved replay fleet, execution cursor and event timeline before restoring a snapshot.
- Reject missing/duplicate robots, foreign-site frames, future events and reused event sequences through the existing recoverable-state path.

## 0.3.0 — 2026-10-14

- Sequential waypoint missions with 1–20 validated poses and one assignment per robot.
- Per-leg readiness checks, deadlines and callback guards; cancellation stops the route.
- Browser route editor, capability negotiation and completed-waypoint progress.
- Real ROS action tests for sequence completion, later rejection and cancellation.
- 56 browser/simulation tests and 30 ROS lifecycle/integration checks.

## 0.2.0 — 2026-10-13

- ROS 2 Jazzy bridge package, launch file and per-robot topic/action configuration.
- Real Nav2 goals, feedback, results and cancellation with bounded request history.
- Goal-timeout and uncertain-outcome holds that prevent blind resubmission.
- Localization/battery subscriptions and stale-data dispatch checks.
- Dedicated browser ROS control page with per-robot assignment tracking.
- 55 browser/simulation tests and 19 ROS lifecycle/integration checks.
- Docker/CI verification using real ROS action servers, plus a labelled browser fixture.


## 0.1.0 — 2026-10-12

- Accountless local fleet simulation with validated commands and safe static-map routing.
- Mission execution, pause/resume/cancel, fault injection and bounded replacement recovery.
- Cargo handoff, charging and explicit failure states.
- Validated browser persistence and recorded run playback/export.
- Responsive mission control, default 2D map and optional local 3D schematic.
- Restored strict build, updated dependencies, 49 behavior tests and CI checks.
- Setup, demo and architecture documentation with explicit simulation boundaries.
