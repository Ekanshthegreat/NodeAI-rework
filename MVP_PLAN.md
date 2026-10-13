# Runnable fleet-orchestration MVP

The MVP is a local robot-fleet simulator with a complete mission lifecycle. It
requires no paid service, database credentials or robot hardware.

Acceptance criteria:

- [x] A clean install builds and tests with strict TypeScript checks enabled.
- [x] The local demo opens without account creation or hard-coded credentials.
- [x] A typed mission targets named locations and receives an obstacle-aware route.
- [x] An available robot follows that route; pause/resume and cancellation work.
- [x] Injected blocked/low-battery faults trigger bounded reassignment or a visible failure.
- [x] Telemetry, events and metrics reflect actual simulated execution.
- [x] A completed or cancelled run can be replayed with working seek/play/speed controls.
- [x] Local history survives refresh; corrupt saved state has a recoverable fallback.
- [x] README explains setup, architecture, a short demo and the limits of vendor adapters.

Implementation checkpoints: restore type/build contracts; reliable local entry;
mission execution and routing; fault recovery; persisted recording and replay;
UI verification and release documentation. Checkpoints are represented by incremental commits describing the implemented changes.

This is simulation software, not a certified robot controller. The language
compiler is a constrained parser; no learned planner or hardware compatibility
claim is implied.
