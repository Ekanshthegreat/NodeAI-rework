import { z } from 'zod';
import type { TelemetryMessage, MissionPlan, EventMessage } from '../types';

export type AdapterType = 'mock' | 'ros' | 'rmf' | 'vda5050';

export interface Adapter {
  id: string;
  type: AdapterType;
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(
    onTelemetry: (msg: TelemetryMessage) => void,
    onEvent: (e: EventMessage) => void
  ): void;
  sendMission(mission: MissionPlan): Promise<void>;
}

export const ExternalTelemetrySchema = z.object({
  type: z.literal('telemetry'),
  ts: z.number().int(),
  robot_id: z.string(),
  vendor: z.enum(['ros', 'rmf', 'vda5050', 'mock']),
  pose: z.object({ x: z.number(), y: z.number(), theta: z.number() }),
  vel: z.number(),
  battery: z.number().min(0).max(1),
  status: z.enum(['IDLE', 'ACTIVE', 'ERROR', 'CHARGING', 'BLOCKED']),
  task_id: z.string().nullable(),
  site_id: z.string().optional()
}).transform(data => ({
  ...data,
  task_id: data.task_id ?? null,
  site_id: data.site_id
}));
