# Running the bridge

Use the [ROS setup guide](ROS2.md) first. The supplied `robots.json` enables:

```json
{
  "audit_path": "nodeai-audit.sqlite3",
  "health_port": 8766
}
```

Merge these keys into the robot config; they are optional. Relative audit paths
use the bridge's working directory. Keep the database on a writable local disk.
Commands and diagnostics bind to loopback. For a remote robot host, use a tunnel.

## Health

```sh
curl -f http://127.0.0.1:8766/healthz
curl http://127.0.0.1:8766/metrics
```

`/healthz` returns 503 before the first ROS heartbeat, after two seconds without
one, or after an audit write failure/output queue drop. These error counters stay
latched until restart. Zero ready robots is reported separately; a healthy
transport does not mean Nav2 or localization is ready.

`/metrics` uses Prometheus text format. It exposes processed commands, transport
rejections, audit failures, output drops, queue depth, active goals and ready
robots. Snapshots refresh every 500 ms. No robot names or request IDs become
metric labels. The HTTP endpoint has an eight-client limit, a 4 KiB header limit
and two-second read/write timeouts. It has no dispatch API.

## Audit history

```sh
python3 -m nodeai_bridge.audit nodeai-audit.sqlite3 --limit 100
python3 -m nodeai_bridge.audit nodeai-audit.sqlite3 --after 100 --limit 1000 > events.jsonl
```

Exports are JSON lines, ordered by database sequence. `--session ID` selects one
bridge process. Each row has a UTC receipt time, session, kind and original body.
A command row means the ROS queue was consumed, not that Nav2 accepted the goal.
Navigation records carry the subsequent lifecycle result. Robot heartbeats are
not stored.

SQLite uses WAL and full synchronization. The bridge retains the latest 100,000
rows across sessions; older rows are deleted. Export by sequence before retention
removes events you need. Each write commits synchronously, so disk stalls can
slow ROS callbacks; this is intended for a small local fleet.

Startup fails if the configured database cannot be opened. Later write failures
are logged and counted; dispatch continues and the history can have gaps. The
reader opens the database read-only and never creates a missing file. Stop the
bridge before copying the database together with its WAL files or use SQLite's
backup API.

## Restart and recovery

A restart creates a new audit session and does not resume or cancel Nav2 actions.
Before dispatching again, reconcile outstanding goals with Nav2/operator state.
Keep the old session's records for that check. The audit database is not an action
checkpoint, an exactly-once execution guarantee or a physical emergency stop.

## Local checks

```sh
export PYTHONPATH=ros2/nodeai_bridge
for suite in gateway transport audit health; do
  python3 -m unittest discover -s ros2/nodeai_bridge/test -p "test_${suite}.py"
done
```

The remaining integration tests run in the Jazzy container. Changes to socket
handling need both paths: pure tests cover malformed input and queue pressure;
ROS tests exercise the actual action clients and subscriptions.
