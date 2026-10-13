import { z } from 'zod';
import { isSegmentClear } from '../lib/planner_path';
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
  const missionIds = new Set(s.missions.map((m) => m.id));
  const largestMission = Math.max(0, ...s.missions.map((m) => Number(m.id.replace(/^M/, ''))));
  if (
    !Number.isFinite(largestMission) ||
    s.nextMission <= largestMission ||
    s.nextEvent <= Math.max(0, ...s.events.map((e) => e.sequence))
  )
    throw new Error('Saved counters would reuse identifiers');
  if (Object.keys(s.faults).some((id) => !ids.has(id))) throw new Error('Unknown faulted robot');
  for (const [id, recording] of Object.entries(s.recordings)) {
    if (
      !missionIds.has(id) ||
      recording.missionId !== id ||
      recording.frames.some(
        (f, i) => !ids.has(f.robotId) || (i > 0 && f.at < recording.frames[i - 1].at)
      )
    )
      throw new Error('Invalid recording references or timestamps');
  }
  for (const m of s.missions) {
    if (
      m.plan.mission_id !== m.id ||
      m.plan.site_id !== s.site.id ||
      m.site_id !== s.site.id ||
      m.plan.robot_selection.include[0] !== m.robotId
    )
      throw new Error('Mission plan references do not match execution');
    if ((m.status === 'active' || m.status === 'paused') && m.step >= m.plan.subtasks.length)
      throw new Error('Active mission has no remaining step');
    if (
      m.route.some(
        (p, i) =>
          Math.abs(p.x) > 10 ||
          Math.abs(p.y) > 10 ||
          (i > 0 && !isSegmentClear(m.route[i - 1], p, s.site.obstacles, s.site.noGo))
      )
    )
      throw new Error('Saved route crosses an obstacle or map boundary');
  }
  return s;
}
