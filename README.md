# NodeAI

[![Validate MVP](https://github.com/Ekanshthegreat/NodeAI-rework/actions/workflows/ci.yml/badge.svg)](https://github.com/Ekanshthegreat/NodeAI-rework/actions/workflows/ci.yml)

A local robot-fleet simulator for planning missions, executing routes and examining
fault recovery. The v0.1.0 MVP runs in a browser without an account, database or
robot hardware.

![Mission control](docs/images/mission-control.png)

## Run it

Use Node.js 24 (`.nvmrc` is included), then:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite and choose **Open mission control**. No `.env`
file is required for the local demo. For a production build, run `npm run build`
and `npm run preview`. Deploy `dist/` on a static host with all application paths
rewritten to `index.html`; `/app` and `/app/replay` are client routes.

## What works

- Constrained text commands compile into validated, typed mission plans.
- Four-neighbour A* routes avoid static obstacles and a no-go polygon.
- Three simulated robots execute navigation, pickup, delivery, inspection,
  charging and docking steps. Robot assignment prevents concurrent missions
  from occupying the same robot.
- Global and individual pause/resume, cancellation and fault injection.
- Blocked and low-battery recovery with one replacement attempt. A replacement
  carrying out a delivery first reaches the stopped robot for a simulated cargo
  handoff. Missing replacements and exhausted retries produce visible failures.
- A 2D map, optional lazy-loaded 3D scene, actual execution events and metrics.
- Browser persistence, recorded playback with seek and speed controls, and JSON
  run exports.

## Try a complete run

1. Dispatch `Deliver supplies from Pharmacy to Ward A`.
2. While AGV-001 is travelling, press its **Block** button.
3. After three simulation seconds, watch AGV-002 take over. Wait for completion.
4. Open **Replay**, select the delivery, and use **Play**, **End** or the seek
   slider to inspect the same recorded run. **Export run JSON** downloads the
   mission, site, snapshots and events.
5. Refresh: the fleet and recent runs remain. **Clear fault** returns the stopped
   robot to service; **Reset demo** replaces the local fleet after confirmation.

See [the demo guide](docs/DEMO.md) for additional scenarios and expected outcomes.

## Commands

Names are case-insensitive and must match an entry in
[`src/lib/anchors.ts`](src/lib/anchors.ts). Six frequently used locations are
labelled on the map: Pharmacy, Ward A, Ward B, Storage, Loading Dock and Charging
Station. The command limit is 300 characters.

| Purpose | Example |
| --- | --- |
| Delivery | `Deliver supplies from Pharmacy to Ward A` |
| Transport | `Transport samples from Laboratory to Pharmacy` |
| Navigation | `Go to Loading Dock` |
| Inspection | `Inspect Ward B` |
| Charging | `Charge` or `Charge at Charging Station` |
| Docking | `Dock at Dock A` |
| Sequence | `Go to Storage then Inspect Ward B` |

`then` and semicolons separate steps. This is an explicit grammar, not an
open-ended language model. Unsupported commands are rejected before dispatch.

## Design and checks

React and Zustand handle the interface. A pure TypeScript state machine owns the
fleet; its fixed-step executor has no network, random telemetry or database
calls. Zod validates plans and resumed snapshots. Three.js supplies the optional
scene. [Architecture and code walkthrough](docs/ARCHITECTURE.md) explains the
state boundaries, algorithms and recovery policy.

```sh
npm run format:check
npm run lint
npm run test:run
npm run build
```

The release has 49 automated tests covering coordinate transforms, command and
route validation, mission execution, recovery budgets, cargo handoff, persistence
and replay lookup. CI installs from the lockfile and runs these checks. The MVP
was also exercised in the browser on desktop and at a 390-pixel mobile width.

## Simulation boundaries

The executor advances 100 simulated milliseconds per timer callback. Browser
throttling can slow the simulation; reload resumes the saved state without
advancing time spent away. Routes use a 0.5-metre grid within a 20 × 20-metre map.
Robots are point agents moving at 1.5 metres per second. Robot footprints,
dynamic obstacles, traffic coordination and robot-to-robot collision avoidance
are outside this MVP.

Actions and battery use are simplified. Blocked recovery waits three simulated
seconds; each mission has one reassignment and a two-minute active-time limit.
Individual pauses do not consume that limit. **Clear fault** models an operator
returning a robot to service, including a replacement battery for low-battery
faults. The one-second cargo handoff is simulated, not a physical protocol.

Local history retains 50 mission summaries, 1,000 global events and ten recordings,
protecting open runs during eviction. Recordings capture states every 500
simulation milliseconds and at lifecycle transitions, retaining at most 1,800
frames per run. Very long paused runs can lose their earliest frames. Dashboard
counts describe retained history, not lifetime totals. Data stays in the current
browser; storage failures are shown, and unreadable saved data is not overwritten
until an explicit reset. Exported JSON has format version 1; importing runs is
outside this release.

Optional ROS, RMF, VDA5050 and Supabase modules are retained from the earlier
prototype under `src/adapters/` and `src/lib/`. They are not used by the default
local execution path and have not been validated against hardware or live vendor
services. Environment examples are only for those integrations. This is a
software simulation MVP, not a production robot controller.
