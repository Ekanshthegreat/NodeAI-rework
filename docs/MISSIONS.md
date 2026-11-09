# Persistent mission service

FastAPI + PostgreSQL + SQLAlchemy + Alembic, with a separate ROS dispatch worker.
The existing React simulator and direct ROS page still work independently.

## Run the full fixture

```sh
docker compose --profile demo up --build --wait -d
python3 -m venv .venv-missions
. .venv-missions/bin/activate
pip install -r services/mission_api/requirements.lock
python services/mission_api/smoke.py
```

Open `http://127.0.0.1:8000/docs` for the API. The smoke command submits a
persisted two-waypoint mission, checks duplicate submission and waits for its
real ROS action-fixture result. [Saved local run](../services/mission_api/examples/fixture-run.json).
The fixture generates poses and battery readings; it uses no robot hardware.

Compose starts PostgreSQL, the API, a worker and the ROS fixture. Without
`--profile demo`, it starts only PostgreSQL and the API. `docker compose down`
keeps the named database volume; `down -v` deliberately deletes it.

Local defaults are `operator-local-development` and `worker-local-development`
for the two bearer tokens. Change `NODEAI_API_TOKEN`, `NODEAI_WORKER_TOKEN` and
`NODEAI_DB_PASSWORD` through your environment or Compose env file. They must be
nonempty and the two tokens must differ. The API port binds to loopback only;
these defaults are for local development. This is not an Internet-facing auth
system or a deployed cloud backend.

## Submit a mission

```sh
curl -X POST http://127.0.0.1:8000/missions \
  -H 'Authorization: Bearer operator-local-development' \
  -H 'Idempotency-Key: delivery-001' \
  -H 'Content-Type: application/json' \
  -d '{"robot_id":"agv1","targets":[{"x":1,"y":2,"yaw":0}]}'
```

The first request returns 201. Repeating the same key and payload returns the
same mission with 200; different content with that key returns 409. Read the
mission at `/missions/{id}` and its ordered history at `/missions/{id}/events`.
Event queries support `after` and `limit` (maximum 100).

POST bodies are capped at 16 KiB, 16 nesting levels and five seconds to receive.
Duplicate JSON fields and nonfinite constants are rejected before validation.
Targets use the same coordinate/yaw bounds as the ROS bridge.

## Dispatch and restart behavior

```mermaid
sequenceDiagram
  participant Client
  participant API
  participant DB as PostgreSQL
  participant Worker
  participant ROS as ROS bridge
  Client->>API: Submit with idempotency key
  API->>DB: Commit mission + queued event
  Worker->>API: Claim ready robot
  API->>DB: Lock row, commit dispatch token + lease
  Worker->>ROS: Send once using dispatch token as request ID
  ROS->>Worker: Accepted / feedback / terminal result
  Worker->>API: Report result with ownership token
  API->>DB: Commit state + lifecycle event
```

Claims use row locks with `SKIP LOCKED`; a partial unique index permits only one
active mission per robot. A claim is committed before anything is sent to ROS.
Workers renew a 30-second lease every five seconds independently of robot traffic.
Expired leases become `unknown` when observed by a claim/heartbeat/report call.
They are never automatically queued again and continue to reserve the robot.

A bridge send failure is uncertain: the command may have arrived. Worker restart
can claim other queued work, but cannot redispatch that mission. A new API process
reads the same database state. The worker accepts a terminal result for its own
dispatch token; stale or conflicting updates return 409.

After checking Nav2/operator evidence, an operator can POST to
`/missions/{id}/reconcile` with `expected_version`, a terminal `state`
(`succeeded`, `cancelled` or `failed`) and a `reason`. Version checks prevent
reconciling stale state. This updates the ledger; it does not send a robot command.
There is no automatic physical action recovery or exactly-once execution claim.

## Work on the service

Set `NODEAI_DATABASE_URL` to a dedicated PostgreSQL database using the
`postgresql+psycopg://` driver, and configure both tokens. From
`services/mission_api`, run `alembic upgrade head`, then
`uvicorn nodeai_missions.api:application --factory`.

Tests require `NODEAI_TEST_DATABASE_URL` pointing to a disposable database;
they migrate it and truncate its mission tables between tests:

```sh
pytest services/mission_api/tests -q
```

CI runs the PostgreSQL concurrency/restart checks and the full Compose/ROS smoke
path. The service currently has a database-backed queue, shared role tokens and
one local worker. RabbitMQ, OIDC, a React API integration and cloud deployment
remain later stages.
