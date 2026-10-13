import { z } from 'zod';

export const TelemetryMessage = z.object({
  type: z.literal('telemetry'),
  ts: z.number().int(),
  robot_id: z.string(),
  vendor: z.enum(['rmf', 'vda5050', 'mock']),
  pose: z.object({ x: z.number(), y: z.number(), theta: z.number() }),
  vel: z.number(),
  battery: z.number().min(0).max(1),
  status: z.enum(['IDLE', 'ACTIVE', 'ERROR', 'CHARGING', 'BLOCKED']),
  task_id: z.string().nullable(),
});
export type TelemetryMessage = z.infer<typeof TelemetryMessage>;

export const MissionPlan = z.object({
  mission_id: z.string(),
  site_id: z.string(),
  natural_language: z.string(),
  constraints: z.object({
    priority: z.enum(['low', 'normal', 'high']),
    no_go: z.array(z.string()),
    time_window_start: z.string().nullable(),
    time_window_end: z.string().nullable(),
    min_battery_pct: z.number().min(0).max(1),
  }),
  subtasks: z.array(
    z.object({
      id: z.string(),
      verb: z.enum(['navigate', 'pickup', 'deliver', 'inspect', 'charge', 'dock']),
      args: z.object({
        from: z.string().nullable(),
        to: z.string().nullable(),
        item: z.string().nullable(),
        room: z.string().nullable(),
        zone: z.string().nullable(),
        dock: z.string().nullable(),
      }),
      policy: z.object({
        reassign_on_blocked_s: z.number().min(0),
        retry_limit: z.number().int().min(0),
      }),
    })
  ),
  robot_selection: z.object({
    strategy: z.enum(['auto', 'manual']),
    allow_vendors: z.array(z.string()),
    include: z.array(z.string()),
    exclude: z.array(z.string()),
  }),
});
export type MissionPlan = z.infer<typeof MissionPlan>;

export const EventMessage = z.object({
  type: z.enum(['mission_event', 'replan_event', 'system']),
  ts: z.number().int(),
  mission_id: z.string().optional(),
  robot_id: z.string().optional(),
  level: z.enum(['INFO', 'WARN', 'ERROR']),
  msg: z.string(),
  payload: z.record(z.unknown()).optional(),
});
export type EventMessage = z.infer<typeof EventMessage>;
