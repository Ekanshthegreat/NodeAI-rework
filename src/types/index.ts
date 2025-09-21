import { z } from 'zod';

// Telemetry Schema
export const TelemetrySchema = z.object({
  type: z.literal('telemetry'),
  ts: z.number(),
  robot_id: z.string(),
  vendor: z.enum(['rmf', 'vda5050', 'mock']),
  pose: z.object({
    x: z.number(),
    y: z.number(),
    theta: z.number(),
  }),
  vel: z.number(),
  battery: z.number().min(0).max(1),
  status: z.enum(['IDLE', 'ACTIVE', 'ERROR', 'CHARGING', 'BLOCKED']),
  task_id: z.string().nullable(),
});

export type TelemetryMessage = z.infer<typeof TelemetrySchema>;

// Mission Plan Schema
export const MissionPlanSchema = z.object({
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
        reassign_on_blocked_s: z.number(),
        retry_limit: z.number(),
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

export type MissionPlan = z.infer<typeof MissionPlanSchema>;

// Database Types
export interface Mission {
  id: string;
  site_id: string;
  nl: string;
  status: string;
  created_at: string;
}

export interface MissionPlanDB {
  mission_id: string;
  plan_json: MissionPlan;
  validated: boolean;
}

export interface Event {
  id: string;
  mission_id: string;
  robot_id: string;
  type: string;
  payload: Record<string, unknown>;
  ts: string;
}

export interface Robot {
  id: string;
  site_id: string;
  vendor: string;
  pose: {
    x: number;
    y: number;
    theta: number;
  };
  battery: number;
  status: string;
  capabilities?: string[];
  updated_at: string;
}

export interface Site {
  id: string;
  name: string;
  map_url: string;
  origin: {
    x: number;
    y: number;
  };
  scale_m_per_px: number;
  obstacles?: Array<{
    id: string;
    rect: { x: number; y: number; w: number; h: number };
  }>;
  noGo?: Array<{
    id: string;
    poly: Array<{ x: number; y: number }>;
  }>;
}

// UI State Types
export interface AppState {
  currentSite: string | null;
  selectedRobot: string | null;
  selectedMission: string | null;
  isRealtimeConnected: boolean;
  telemetryEnabled: boolean;
}