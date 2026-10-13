import { z } from 'zod';
import { MissionPlan } from '../lib/schemas';
import { MAX_FRAMES, MAX_RECORDINGS, type FleetState } from './engine';
const number = z.number().finite();
const nonnegative = number.nonnegative();
const point = z.object({ x: number, y: number });
const pose = point.extend({ theta: number });
const robot = z.object({
  id: z.string(),
  site_id: z.string(),
  vendor: z.enum(['mock', 'ros', 'rmf', 'vda5050']),
  pose,
  battery: number.min(0).max(1),
  status: z.enum(['IDLE', 'ACTIVE', 'ERROR', 'CHARGING', 'BLOCKED']),
  updated_at: z.string(),
});
const status = z.enum(['active', 'paused', 'completed', 'failed', 'cancelled']);
const mission = z.object({
  id: z.string(),
  site_id: z.string(),
  nl: z.string(),
  status,
  created_at: z.string(),
  plan: MissionPlan,
  robotId: z.string(),
  route: z.array(pose).max(50000),
  waypoint: nonnegative.int(),
  step: nonnegative.int(),
  phase: z.enum(['travel', 'action', 'handoff-travel', 'handoff-action']),
  actionMs: nonnegative,
  retries: nonnegative.int(),
  hasCargo: z.boolean(),
  blockedSince: nonnegative.nullable(),
  startedAt: nonnegative,
  activeMs: nonnegative,
  finishedAt: nonnegative.nullable(),
  error: z.string().nullable(),
});
const frame = z.object({
  at: nonnegative,
  status,
  step: nonnegative.int(),
  robotId: z.string(),
  robots: z.array(robot).max(20),
});
const event = z.object({
  sequence: nonnegative.int(),
  at: nonnegative,
  type: z.string(),
  message: z.string(),
  missionId: z.string().nullable(),
  robotId: z.string().nullable(),
});
const schema = z.object({
  version: z.literal(1),
  baseTime: nonnegative,
  elapsedMs: nonnegative,
  nextMission: nonnegative.int().positive(),
  nextEvent: nonnegative.int().positive(),
  site: z.object({
    id: z.string(),
    name: z.string(),
    map_url: z.string(),
    origin: point,
    scale_m_per_px: nonnegative.positive(),
    created_at: z.string().optional(),
    obstacles: z
      .array(
        z.object({
          id: z.string(),
          rect: z.object({ x: number, y: number, w: nonnegative, h: nonnegative }),
        })
      )
      .optional(),
    noGo: z.array(z.object({ id: z.string(), poly: z.array(point).min(3) })).optional(),
  }),
  robots: z.array(robot).min(1).max(20),
  missions: z.array(mission).max(50),
  events: z.array(event).max(1000),
  recordings: z.record(
    z.object({
      missionId: z.string(),
      frames: z.array(frame).max(MAX_FRAMES),
      events: z.array(event).max(300).default([]),
    })
  ),
  faults: z.record(z.enum(['BLOCKED', 'LOW_BATTERY'])),
  running: z.boolean(),
  selfHealing: z.boolean(),
});
export const STORAGE_KEY = 'nodeai:fleet:v1';

export function decodeSnapshot(text: string): FleetState {
  if (text.length > 4500000) throw new Error('Saved snapshot is too large');
  const s = schema.parse(JSON.parse(text));
  const ids = new Set(s.robots.map((r) => r.id));
  if (
    ids.size !== s.robots.length ||
    new Set(s.missions.map((m) => m.id)).size !== s.missions.length
  )
    throw new Error('Duplicate saved identifiers');
  if (Object.keys(s.recordings).length > MAX_RECORDINGS)
    throw new Error('Too many saved recordings');
  if (
    s.missions.some(
      (m) => !ids.has(m.robotId) || m.waypoint > m.route.length || m.step > m.plan.subtasks.length
    )
  )
    throw new Error('Invalid saved mission references');
  const occupied = s.missions
    .filter((m) => m.status === 'active' || m.status === 'paused')
    .map((m) => m.robotId);
  if (new Set(occupied).size !== occupied.length)
    throw new Error('Conflicting saved robot assignments');
  return s;
}
