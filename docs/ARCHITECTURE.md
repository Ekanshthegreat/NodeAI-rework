# Architecture

The local simulator described below is separate from the ROS 2 runtime. See
[ROS 2 architecture](ROS2.md) for topic/action ports and the real navigation
lifecycle. ROS mode delegates route planning to Nav2 rather than local A*.


## A mission from input to replay

```mermaid
flowchart LR
  UI[Command form] --> Parser[Constrained parser + Zod]
  Parser --> Engine[Pure fleet state machine]
  Planner[A* with footprint clearance] --> Engine
  Engine --> Store[Zustand fleet store]
  Store --> Map[2D / lazy 3D views]
  Store --> Storage[Validated browser snapshot]
  Engine --> Recorder[Frames + mission events]
  Recorder --> Replay[Seek / playback / JSON export]
```

Start with `src/simulation/engine.ts`. `FleetState` contains the site, robots,
missions, fault map, clock, events and recordings. `submitMission` returns a new
state only after parsing and checking every initial route leg. Each mission has
one assigned robot, a step index and a phase. `tickFleet` advances execution by
100 ms and returns a new state without modifying its input.

The UI calls actions in `src/store/useFleetStore.ts`; it does not move robots or
complete tasks itself. The store applies the returned state, mirrors selected
fields into the older scene view model and saves at action boundaries and every
two seconds. `Layout.tsx` owns the timer and page-hide save. A global pause freezes
the simulated clock; an individual pause leaves other missions running.

## Planning

`src/lib/planner.ts` recognizes a small command grammar and canonical named
locations. It produces a Zod `MissionPlan` rather than executable strings.
Assignment chooses an idle, fault-free robot with sufficient battery, sorting
by battery and then robot ID. This is a deterministic heuristic, not an optimal
fleet scheduler.

`src/lib/planner_path.ts` searches a four-neighbour grid using A* with a Euclidean
distance heuristic and safe connections from each endpoint. A binary min-heap
selects the next candidate in logarithmic time, with insertion order breaking
equal-cost ties so reroutes remain deterministic. Edge checks reject rectangle and polygon intersections, including
boundary contact. The planner checks every endpoint join, skips grid vertices with clear line of
sight, and rounds corners only when every resulting segment passes the same
wall, polygon and robot-clearance checks. Unreachable routes throw instead of returning an unsafe
straight line. The simulator uses a 0.65 m bounding radius around each robot and requires
1.35 m between centers. Routes account for walls, restricted polygons and the
current positions of other robots. Every movement segment is checked again
before it commits, including other robots' swept segments in the same tick.

A blocked movement waits and retries A* at most once per simulation second.
Traffic waits are recorded separately from injected faults and do not consume
the fault-recovery retry. Active missions reserve separate stopping positions
within 2.3 m of a shared named destination. A cargo handoff stops beside the
faulted robot. Mission order provides deterministic movement priority. Tight
corridors can remain blocked until another robot moves or the mission times out;
this local policy does not guarantee deadlock-free scheduling.

## Execution and recovery

Navigation follows the clearance-checked route with a 1.5 m/s speed limit,
1.2 m/s² acceleration/braking target and a 2.4 rad/s heading limit. Robots face
the next segment before moving when a turn exceeds that tick’s heading budget.
The 3D wheel rotation follows travelled distance. Other verbs travel to
their location, then perform a short simulated action. Pickup records cargo;
delivery clears it. Charging increases battery until the target is reached.
Completion and cancellation release the robot unless it still has a fault.

A blocked robot waits three simulated seconds before recovery. Low battery can
trigger immediate recovery. Each mission permits one reassignment. A replacement
must be idle, healthy, sufficiently charged and able to reach the next target.
If the failed robot already picked up cargo, the replacement first routes to its
last position with footprint clearance and performs a simulated handoff. An unavailable route or exhausted
budget fails the mission. Recovery disabled leaves the assignment in place until
an operator clears the fault or the two-minute active-time deadline expires.
These limits keep the simulation from retrying indefinitely.

## Persistence and replay

`src/simulation/persistence.ts` decodes browser snapshots with bounded Zod
schemas plus cross-reference checks. It rejects conflicting assignments,
stale counters, overlapping live robots, mismatched mission plans, invalid routes and unordered recording
frames. An unreadable snapshot produces a fresh in-memory demo and a visible
warning; automatic saves leave the unreadable value intact until explicit reset.
Browser storage is not a server database or a synchronization mechanism.

The engine records every 500 simulation ms and at lifecycle transitions. Completed
recordings are shared between immutable states; appending a frame or event creates
a new recording buffer. Recorded
mission events are stored with their run, independently of the bounded global
log. `src/simulation/replay.ts` binary-searches the latest frame at or before a
requested time. Replay displays those snapshots; it does not re-execute the
mission or write to the live fleet. Export contains version, mission, site and
recording. Playback is available for terminal runs, including failures and
cancellations. Zero-duration cancellations have a terminal frame and no playable
time interval.

## Reading order and engineering topics

| Read | What to understand |
| --- | --- |
| `lib/schemas.ts`, `types/index.ts` | Contracts and validation boundaries |
| `lib/planner.ts` | Parsing a limited language into structured tasks |
| `lib/planner_path.ts` | A*, collision geometry and safe failure |
| `simulation/engine.ts` | State transitions, deterministic time and bounded retries |
| `simulation/engine.test.ts` | Behavioral invariants and fault scenarios |
| `simulation/persistence.ts` | Safe restoration and cross-reference integrity |
| `store/useFleetStore.ts` | Separating effects from the core model |
| `pages/DashboardPage.tsx`, `pages/ReplayPage.tsx` | UI derived from authoritative state |

The project demonstrates TypeScript, React, state-machine design, search
algorithms, event recording, fault recovery and testable system boundaries. It
does not demonstrate a trained AI planner, deployed robotics stack or verified
hardware integration. Those would require separate implementation and evidence.

## Next milestones beyond the MVP

Time-based corridor reservations; configurable sites; safer
vendor integration contracts backed by device fixtures; run import and server
persistence; and a headless workload benchmark. The optional 3D renderer remains
a large lazy-loaded bundle. The 3D workspace opens by default, with a 2D map available if WebGL cannot load.
