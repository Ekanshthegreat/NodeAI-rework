# NodeAI

A TypeScript robot-fleet orchestration prototype with a React/Three.js dashboard,
mission planning, telemetry adapters and fault-recovery policies.

A runnable local simulation MVP is being completed. See [MVP_PLAN.md](MVP_PLAN.md)
for acceptance criteria. The existing build and test contracts are being repaired;
mission execution and replay are not yet complete.

## Development

```sh
npm ci
npm run dev
npm run build
npm test -- --run
```

The MVP will run locally without a Supabase account or external robot connection.
Optional Supabase and vendor adapters remain separate integration paths. Copying
`.env.example` is only necessary when configuring those integrations; do not put
private credentials in committed files.
