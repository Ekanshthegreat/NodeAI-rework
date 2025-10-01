export interface Site {
  id: string;
  name: string;
  map_url: string;
  origin: { x: number; y: number };
  scale_m_per_px: number;
  created_at: string;
}

export interface Robot {
  id: string;
  site_id: string;
  vendor: 'ros' | 'rmf' | 'vda5050' | 'mock';
  pose: { x: number; y: number; theta: number };
  battery: number;
  status: 'IDLE' | 'ACTIVE' | 'ERROR' | 'CHARGING' | 'BLOCKED';
  updated_at: string;
}

export interface Mission {
  id: string;
  site_id: string;
  nl: string;
  status: 'planning' | 'active' | 'completed' | 'failed';
  created_at: string;
}

export interface MissionPlan {
  mission_id: string;
  site_id: string;
  natural_language: string;
  constraints: {
    priority: 'low' | 'normal' | 'high';
    no_go: string[];
    time_window_start: string | null;
    time_window_end: string | null;
    min_battery_pct: number;
  };
  subtasks: Array<{
    id: string;
    verb: 'navigate' | 'pickup' | 'deliver' | 'inspect' | 'charge' | 'dock';
    args: {
      from: string | null;
      to: string | null;
      item: string | null;
      room: string | null;
      zone: string | null;
      dock: string | null;
    };
    policy: {
      reassign_on_blocked_s: number;
      retry_limit: number;
    };
  }>;
  robot_selection: {
    strategy: 'auto' | 'manual';
    allow_vendors: string[];
    include: string[];
    exclude: string[];
  };
}

export interface Event {
  id: string;
  mission_id?: string;
  robot_id?: string;
  type: string;
  payload: Record<string, unknown>;
  ts: string;
}

export interface EventMessage {
  ts: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  msg: string;
  payload?: Record<string, unknown>;
}

export interface TelemetryData {
  robot_id: string;
  pose: { x: number; y: number; theta: number };
  battery: number;
  status: string;
  velocity: number;
  timestamp: number;
}

export interface TelemetryMessage {
  type: 'telemetry';
  ts: number;
  robot_id: string;
  vendor: 'ros' | 'rmf' | 'vda5050' | 'mock';
  pose: { x: number; y: number; theta: number };
  vel: number;
  battery: number;
  status: 'IDLE' | 'ACTIVE' | 'ERROR' | 'CHARGING' | 'BLOCKED';
  task_id: string | null;
  site_id?: string;
}

export interface KPI {
  totalMissions: number;
  activeMissions: number;
  completedMissions: number;
  totalRobots: number;
  activeRobots: number;
  batteryAverage: number;
  uptime: number;
}
