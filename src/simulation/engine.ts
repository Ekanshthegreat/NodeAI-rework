import type { Robot, Site, Mission, MissionPlan } from '../types';
import { compileNLToPlan } from '../lib/planner';
import { resolveAnchor } from '../lib/anchors';
import { planPath, type PathPoint } from '../lib/planner_path';

export type MissionStatus = 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type Fault = 'BLOCKED' | 'LOW_BATTERY';
export type Phase = 'travel' | 'action' | 'handoff-travel' | 'handoff-action';
export interface Execution extends Omit<Mission, 'status'> {
  status: MissionStatus;
  plan: MissionPlan;
  robotId: string;
  route: PathPoint[];
  waypoint: number;
  step: number;
  phase: Phase;
  actionMs: number;
  retries: number;
  hasCargo: boolean;
  blockedSince: number | null;
  startedAt: number;
  activeMs: number;
  finishedAt: number | null;
  error: string | null;
}
export interface SimEvent {
  sequence: number;
  at: number;
  type: string;
  message: string;
  missionId: string | null;
  robotId: string | null;
}
export interface Frame {
  at: number;
  status: MissionStatus;
  step: number;
  robotId: string;
  robots: Robot[];
}
export interface Recording {
  missionId: string;
  frames: Frame[];
  events: SimEvent[];
}
export interface FleetState {
  version: 1;
  baseTime: number;
  elapsedMs: number;
  nextMission: number;
  nextEvent: number;
  site: Site;
  robots: Robot[];
  missions: Execution[];
  events: SimEvent[];
  recordings: Record<string, Recording>;
  faults: Record<string, Fault>;
  running: boolean;
  selfHealing: boolean;
}
export const TICK_MS = 100;
export const MAX_RECORDINGS = 10;
export const MAX_FRAMES = 1800;
const SPEED = 1.5;
const TIMEOUT_MS = 120000;
const terminal = (m: Execution) => ['completed', 'failed', 'cancelled'].includes(m.status);
const copy = (s: FleetState): FleetState => structuredClone(s);
const timestamp = (s: FleetState) => new Date(s.baseTime + s.elapsedMs).toISOString();

export function createDemoState(baseTime = Date.now()): FleetState {
  const site: Site = {
    id: 'hospital-alpha',
    name: 'Hospital Alpha',
    map_url: '',
    origin: { x: 0, y: 0 },
    scale_m_per_px: 0.02,
    obstacles: [
      { id: 'central-block', rect: { x: -1, y: 1, w: 2, h: 3 } },
      { id: 'supply-room', rect: { x: 1.5, y: 3, w: 2, h: 1.5 } },
    ],
    noGo: [
      {
        id: 'restricted',
        poly: [
          { x: -8, y: 6 },
          { x: -5, y: 6 },
          { x: -6, y: 9 },
        ],
      },
    ],
  };
  const robots: Robot[] = [-6, 0, 6].map((x, i) => ({
    id: `AGV-00${i + 1}`,
    site_id: site.id,
    vendor: 'mock',
    pose: { x, y: -6, theta: 0 },
    battery: 0.95 - i * 0.08,
    status: 'IDLE',
    updated_at: new Date(baseTime).toISOString(),
  }));
  return {
    version: 1,
    baseTime,
    elapsedMs: 0,
    nextMission: 1,
    nextEvent: 1,
    site,
    robots,
    missions: [],
    events: [],
    recordings: {},
    faults: {},
    running: true,
    selfHealing: true,
  };
}
function emit(
  s: FleetState,
  type: string,
  message: string,
  m: Execution | null = null,
  robotId: string | null = null
): void {
  s.events.push({
    sequence: s.nextEvent++,
    at: s.elapsedMs,
    type,
    message,
    missionId: m?.id ?? null,
    robotId: robotId ?? m?.robotId ?? null,
  });
  if (m && s.recordings[m.id]) s.recordings[m.id].events.push(s.events[s.events.length - 1]);
  s.events = s.events.slice(-1000);
}
function capture(s: FleetState, m: Execution, force = false): void {
  const record = s.recordings[m.id];
  if (!record) return;
  const last = record.frames[record.frames.length - 1];
  if (!force && last && s.elapsedMs - last.at < 500) return;
  const frame: Frame = {
    at: s.elapsedMs,
    status: m.status,
    step: m.step,
    robotId: m.robotId,
    robots: structuredClone(s.robots),
  };
  if (last?.at === frame.at) record.frames[record.frames.length - 1] = frame;
  else record.frames.push(frame);
  record.frames = record.frames.slice(-MAX_FRAMES);
}
function routeTo(
  s: FleetState,
  m: Execution,
  robot: Robot,
  target: { x: number; y: number }
): void {
  m.route = planPath({
    start: robot.pose,
    goal: target,
    obstacles: s.site.obstacles,
    noGo: s.site.noGo,
  });
  m.waypoint = m.route.length > 1 ? 1 : 0;
  m.actionMs = 0;
}
function startStep(s: FleetState, m: Execution, robot: Robot): void {
  const t = m.plan.subtasks[m.step];
  if (!t) {
    finish(s, m, 'completed');
    return;
  }
  const location = t.args.to ?? t.args.from ?? t.args.dock ?? t.args.room ?? t.args.zone;
  const target = location ? resolveAnchor(location) : null;
  if (!target) throw new Error('Mission has no resolvable target');
  routeTo(s, m, robot, target);
  m.phase = 'travel';
}
function finish(
  s: FleetState,
  m: Execution,
  status: 'completed' | 'failed' | 'cancelled',
  error: string | null = null
): void {
  m.status = status;
  m.finishedAt = s.elapsedMs;
  m.error = error;
  const robot = s.robots.find((r) => r.id === m.robotId);
  if (robot && !s.faults[robot.id]) robot.status = 'IDLE';
  emit(s, `mission_${status}`, error ?? `Mission ${m.id} ${status}`, m);
  capture(s, m, true);
}

export function submitMission(state: FleetState, text: string): FleetState {
  const s = copy(state);
  const plan = compileNLToPlan(text, s.site.id, s.robots);
  const id = `M${String(s.nextMission).padStart(3, '0')}`;
  plan.mission_id = id;
  plan.subtasks.forEach((t, i) => {
    t.id = `${id}-step-${i + 1}`;
  });
  const robot = s.robots.find((r) => r.id === plan.robot_selection.include[0])!;
  // Validate every planned leg before claiming or publishing the mission.
  let position = robot.pose;
  for (const t of plan.subtasks) {
    const target = resolveAnchor(
      t.args.to ?? t.args.from ?? t.args.dock ?? t.args.room ?? t.args.zone ?? ''
    );
    if (!target) throw new Error('Unknown mission target');
    planPath({ start: position, goal: target, obstacles: s.site.obstacles, noGo: s.site.noGo });
    position = { ...position, ...target };
  }
  const m: Execution = {
    id,
    site_id: s.site.id,
    nl: text.trim(),
    status: 'active',
    created_at: timestamp(s),
    plan,
    robotId: robot.id,
    route: [],
    waypoint: 0,
    step: 0,
    phase: 'travel',
    actionMs: 0,
    retries: 0,
    hasCargo: false,
    blockedSince: null,
    startedAt: s.elapsedMs,
    activeMs: 0,
    finishedAt: null,
    error: null,
  };
  s.nextMission++;
  robot.status = 'ACTIVE';
  s.missions.push(m);
  s.missions = s.missions.slice(-50);
  const keys = Object.keys(s.recordings);
  if (keys.length >= MAX_RECORDINGS) {
    const old = keys.find((k) => !s.missions.some((x) => x.id === k && !terminal(x)));
    if (old) delete s.recordings[old];
  }
  s.recordings[id] = { missionId: id, frames: [], events: [] };
  startStep(s, m, robot);
  emit(s, 'mission_started', `${id} assigned to ${robot.id}`, m);
  capture(s, m, true);
  return s;
}
export function setMissionPaused(state: FleetState, id: string, paused: boolean): FleetState {
  const s = copy(state),
    m = s.missions.find((x) => x.id === id);
  if (!m || terminal(m)) return s;
  m.status = paused ? 'paused' : 'active';
  emit(
    s,
    paused ? 'mission_paused' : 'mission_resumed',
    `${id} ${paused ? 'paused' : 'resumed'}`,
    m
  );
  capture(s, m, true);
  return s;
}
export function cancelMission(state: FleetState, id: string): FleetState {
  const s = copy(state),
    m = s.missions.find((x) => x.id === id);
  if (m && !terminal(m)) finish(s, m, 'cancelled');
  return s;
}
export function injectFault(state: FleetState, robotId: string, fault: Fault): FleetState {
  const s = copy(state),
    robot = s.robots.find((r) => r.id === robotId);
  if (!robot) throw new Error('Unknown robot');
  s.faults[robotId] = fault;
  robot.status = fault === 'BLOCKED' ? 'BLOCKED' : 'CHARGING';
  if (fault === 'LOW_BATTERY') robot.battery = 0.05;
  const mission = s.missions.find((m) => m.robotId === robotId && !terminal(m));
  if (mission) mission.blockedSince = s.elapsedMs;
  emit(s, 'fault_injected', `${fault} injected on ${robotId}`, mission ?? null, robotId);
  if (mission) capture(s, mission, true);
  return s;
}
export function clearFault(state: FleetState, robotId: string): FleetState {
  const s = copy(state),
    robot = s.robots.find((r) => r.id === robotId);
  if (!robot) return s;
  const fault = s.faults[robotId];
  delete s.faults[robotId];
  if (fault === 'LOW_BATTERY') robot.battery = 0.8;
  robot.status = s.missions.some((m) => m.robotId === robotId && !terminal(m)) ? 'ACTIVE' : 'IDLE';
  for (const m of s.missions.filter((m) => m.robotId === robotId)) m.blockedSince = null;
  emit(s, 'fault_cleared', `Fault cleared on ${robotId}`, null, robotId);
  return s;
}
function recover(s: FleetState, m: Execution, old: Robot): void {
  const policy = m.plan.subtasks[m.step]?.policy ?? m.plan.subtasks[0].policy;
  if (m.retries >= policy.retry_limit) {
    finish(s, m, 'failed', 'Retry budget exhausted');
    return;
  }
  const available = s.robots
    .filter(
      (r) =>
        r.id !== old.id &&
        r.status === 'IDLE' &&
        !s.faults[r.id] &&
        r.battery >= m.plan.constraints.min_battery_pct
    )
    .sort((a, b) => b.battery - a.battery || a.id.localeCompare(b.id));
  for (const robot of available) {
    try {
      if (m.hasCargo) {
        routeTo(s, m, robot, old.pose);
        m.phase = 'handoff-travel';
      } else startStep(s, m, robot);
    } catch {
      continue;
    }
    m.robotId = robot.id;
    m.plan.robot_selection.include = [robot.id];
    m.retries++;
    m.blockedSince = null;
    robot.status = 'ACTIVE';
    if (!s.faults[old.id]) old.status = 'CHARGING';
    emit(
      s,
      'mission_reassigned',
      `${m.id}: ${old.id} → ${robot.id}${m.hasCargo ? ' via simulated cargo handoff' : ''}`,
      m
    );
    capture(s, m, true);
    return;
  }
  finish(s, m, 'failed', 'No reachable, idle replacement robot is available');
}
function advance(robot: Robot, m: Execution, budget: number): boolean {
  while (m.waypoint < m.route.length) {
    const target = m.route[m.waypoint],
      dx = target.x - robot.pose.x,
      dy = target.y - robot.pose.y,
      distance = Math.hypot(dx, dy);
    if (distance > budget + 1e-9) {
      robot.pose = {
        x: robot.pose.x + (dx / distance) * budget,
        y: robot.pose.y + (dy / distance) * budget,
        theta: Math.atan2(dy, dx),
      };
      return false;
    }
    robot.pose = { ...target };
    budget -= distance;
    m.waypoint++;
  }
  return true;
}

/** One fixed simulation step: no wall clock, random walk, I/O or React dependency. */
export function tickFleet(state: FleetState): FleetState {
  if (!state.running) return state;
  const s = copy(state);
  s.elapsedMs += TICK_MS;
  for (const m of s.missions) {
    if (terminal(m)) continue;
    if (m.status === 'paused') {
      capture(s, m);
      continue;
    }
    m.activeMs += TICK_MS;
    if (m.activeMs > TIMEOUT_MS) {
      finish(s, m, 'failed', 'Mission exceeded the two-minute simulation limit');
      continue;
    }
    const robot = s.robots.find((r) => r.id === m.robotId)!;
    const fault =
      s.faults[robot.id] ??
      (robot.battery < m.plan.constraints.min_battery_pct ? 'LOW_BATTERY' : undefined);
    if (fault) {
      m.blockedSince ??= s.elapsedMs;
      const threshold = (m.plan.subtasks[m.step]?.policy.reassign_on_blocked_s ?? 3) * 1000;
      if (s.selfHealing && (fault === 'LOW_BATTERY' || s.elapsedMs - m.blockedSince >= threshold))
        recover(s, m, robot);
      capture(s, m);
      continue;
    }
    if (m.phase === 'travel' || m.phase === 'handoff-travel') {
      robot.battery = Math.max(0, robot.battery - 0.00008);
      if (advance(robot, m, (SPEED * TICK_MS) / 1000)) {
        m.phase = m.phase === 'handoff-travel' ? 'handoff-action' : 'action';
        m.actionMs = 0;
      }
    } else {
      m.actionMs += TICK_MS;
      if (m.phase === 'handoff-action') {
        if (m.actionMs >= 1000) {
          emit(s, 'cargo_handoff', `Simulated cargo transferred to ${robot.id}`, m);
          startStep(s, m, robot);
        }
      } else {
        const task = m.plan.subtasks[m.step];
        if (task.verb === 'charge') robot.battery = Math.min(0.95, robot.battery + 0.005);
        const duration = task.verb === 'navigate' ? 100 : task.verb === 'inspect' ? 2000 : 1000;
        if (m.actionMs >= duration && (task.verb !== 'charge' || robot.battery >= 0.95)) {
          if (task.verb === 'pickup') m.hasCargo = true;
          if (task.verb === 'deliver') m.hasCargo = false;
          emit(s, 'subtask_completed', `${m.id}: ${task.verb} complete`, m);
          m.step++;
          try {
            startStep(s, m, robot);
          } catch (error) {
            finish(s, m, 'failed', error instanceof Error ? error.message : 'Route failed');
          }
        }
      }
    }
    robot.updated_at = timestamp(s);
    capture(s, m);
  }
  return s;
}
