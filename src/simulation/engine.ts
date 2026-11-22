import type { Robot, Site, Mission, MissionPlan } from '../types';
import { compileNLToPlan } from '../lib/planner';
import { resolveAnchor } from '../lib/anchors';
import { planPath, type PathPoint } from '../lib/planner_path';
import {
  movementBlocker,
  occupiedRobots,
  ROBOT_RADIUS,
  ROBOT_SEPARATION,
  type Movement,
} from './traffic';

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
  traffic?: { waitingFor: string | null; waitMs: number; reroutes: number };
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
const copy = (s: FleetState): FleetState => ({
  ...structuredClone({ ...s, recordings: {} }),
  recordings: { ...s.recordings },
});
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
  if (m && s.recordings[m.id]) {
    const recording = s.recordings[m.id];
    s.recordings[m.id] = {
      ...recording,
      events: [...recording.events, s.events[s.events.length - 1]].slice(-300),
    };
  }
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
  const frames = record.frames.slice();
  if (last?.at === frame.at) frames[frames.length - 1] = frame;
  else frames.push(frame);
  s.recordings[m.id] = { ...record, frames: frames.slice(-MAX_FRAMES) };
}
function routeTo(
  s: FleetState,
  m: Execution,
  robot: Robot,
  target: { x: number; y: number }
): void {
  const reserved = s.missions
    .filter((other) => other.id !== m.id && !terminal(other))
    .map((other) => other.route[other.route.length - 1])
    .filter((p) => p !== undefined);
  const occupied = [
    ...s.robots.filter((other) => other.id !== robot.id).map((other) => other.pose),
    ...reserved,
  ];
  const candidates = [
    target,
    ...[1.6, 2.3].flatMap((radius) =>
      Array.from({ length: 8 }, (_, i) => ({
        x: target.x + Math.cos((i * Math.PI) / 4) * radius,
        y: target.y + Math.sin((i * Math.PI) / 4) * radius,
      }))
    ),
  ];
  let route: PathPoint[] | undefined;
  for (const goal of candidates) {
    if (occupied.some((p) => Math.hypot(p.x - goal.x, p.y - goal.y) < ROBOT_SEPARATION)) continue;
    try {
      route = planPath({
        start: robot.pose,
        goal,
        obstacles: s.site.obstacles,
        occupied: occupiedRobots(s.robots, robot),
        noGo: s.site.noGo,
        clearanceMeters: ROBOT_RADIUS,
      });
      break;
    } catch {
      /* Try another stopping position at this location. */
    }
  }
  if (!route) throw new Error('No clear stopping position is available at this location');
  m.route = route;
  m.waypoint = m.route.length > 1 ? 1 : 0;
  m.actionMs = 0;
  m.traffic = { waitingFor: null, waitMs: 0, reroutes: m.traffic?.reroutes ?? 0 };
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
  if (m.traffic) {
    m.traffic.waitingFor = null;
    m.traffic.waitMs = 0;
  }
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
    planPath({
      start: position,
      goal: target,
      obstacles: s.site.obstacles,
      noGo: s.site.noGo,
      clearanceMeters: ROBOT_RADIUS,
    });
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
  robot.status = fault === 'BLOCKED' ? 'BLOCKED' : 'ERROR';
  if (fault === 'LOW_BATTERY') robot.battery = 0.05;
  const mission = s.missions.find((m) => m.robotId === robotId && !terminal(m));
  if (mission) {
    mission.blockedSince = s.elapsedMs;
    if (mission.traffic) {
      mission.traffic.waitingFor = null;
      mission.traffic.waitMs = 0;
    }
  }
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
  if (fault === 'LOW_BATTERY' || robot.battery < 0.2) robot.battery = 0.8;
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
    if (!s.faults[old.id]) old.status = 'ERROR';
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
function advance(
  s: FleetState,
  robot: Robot,
  m: Execution,
  budget: number,
  movements: Movement[]
): boolean {
  const traffic = (m.traffic ??= { waitingFor: null, waitMs: 0, reroutes: 0 });
  while (m.waypoint < m.route.length) {
    const target = m.route[m.waypoint];
    const dx = target.x - robot.pose.x,
      dy = target.y - robot.pose.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.min(distance, budget);
    const next =
      distance < 1e-9
        ? { ...robot.pose }
        : {
            x: robot.pose.x + (dx / distance) * step,
            y: robot.pose.y + (dy / distance) * step,
            theta: Math.atan2(dy, dx),
          };
    const blocker = movementBlocker(s.site, robot, robot.pose, next, s.robots, movements);
    if (blocker) {
      if (traffic.waitingFor !== blocker)
        emit(s, 'traffic_wait', `${robot.id} yielding to ${blocker}`, m);
      traffic.waitingFor = blocker;
      traffic.waitMs += TICK_MS;
      // Replan at a bounded rate, treating every other robot as occupied space.
      if (traffic.waitMs % 1000 === TICK_MS) {
        try {
          const route = planPath({
            start: robot.pose,
            goal: m.route[m.route.length - 1],
            obstacles: s.site.obstacles,
            occupied: occupiedRobots(s.robots, robot),
            noGo: s.site.noGo,
            clearanceMeters: ROBOT_RADIUS,
          });
          m.route = route;
          m.waypoint = route.length > 1 ? 1 : 0;
          traffic.reroutes++;
          emit(s, 'traffic_rerouted', `${robot.id} planned around occupied space`, m);
        } catch {
          /* Keep the position and retry while the destination is occupied. */
        }
      }
      return false;
    }
    if (traffic.waitingFor) emit(s, 'traffic_resumed', `${robot.id} resumed travel`, m);
    traffic.waitingFor = null;
    traffic.waitMs = 0;
    movements.push({ robotId: robot.id, from: { ...robot.pose }, to: next });
    robot.pose = next;
    budget -= step;
    if (distance > step + 1e-9) return false;
    m.waypoint++;
    if (budget < 1e-9 && m.waypoint < m.route.length) return false;
  }
  return true;
}

/** One fixed simulation step: no wall clock, random walk, I/O or React dependency. */
export function tickFleet(state: FleetState): FleetState {
  if (!state.running) return state;
  const s = copy(state);
  s.elapsedMs += TICK_MS;
  const movements: Movement[] = [];
  for (const m of s.missions) {
    if (terminal(m)) continue;
    if (m.status === 'paused') {
      capture(s, m);
      continue;
    }
    m.activeMs += TICK_MS;
    if (m.activeMs >= TIMEOUT_MS) {
      finish(s, m, 'failed', 'Mission exceeded the two-minute simulation limit');
      continue;
    }
    const robot = s.robots.find((r) => r.id === m.robotId)!;
    const fault =
      s.faults[robot.id] ??
      (robot.battery < m.plan.constraints.min_battery_pct ? 'LOW_BATTERY' : undefined);
    if (fault) {
      if (m.traffic) {
        m.traffic.waitingFor = null;
        m.traffic.waitMs = 0;
      }
      if (!s.faults[robot.id]) {
        s.faults[robot.id] = fault;
        robot.status = 'ERROR';
        emit(s, 'low_battery_detected', `Low battery detected on ${robot.id}`, m);
      }
      m.blockedSince ??= s.elapsedMs;
      const threshold = (m.plan.subtasks[m.step]?.policy.reassign_on_blocked_s ?? 3) * 1000;
      if (s.selfHealing && (fault === 'LOW_BATTERY' || s.elapsedMs - m.blockedSince >= threshold))
        recover(s, m, robot);
      capture(s, m);
      continue;
    }
    if (m.phase === 'travel' || m.phase === 'handoff-travel') {
      robot.battery = Math.max(0, robot.battery - 0.00008);
      if (advance(s, robot, m, (SPEED * TICK_MS) / 1000, movements)) {
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
        if (task.verb === 'charge') {
          robot.status = 'CHARGING';
          robot.battery = Math.min(0.95, robot.battery + 0.005);
        }
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
