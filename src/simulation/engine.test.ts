import { describe, it, expect } from 'vitest';
import {
  createDemoState,
  submitMission,
  tickFleet,
  injectFault,
  clearFault,
  setMissionPaused,
  cancelMission,
  type FleetState,
} from './engine';
const delivery = 'Deliver supplies from Pharmacy to Ward A';
function advance(s: FleetState, ticks = 1000): FleetState {
  for (let i = 0; i < ticks; i++) s = tickFleet(s);
  return s;
}
describe('mission execution', () => {
  it('executes a complete delivery and releases its assigned robot', () => {
    const s = advance(submitMission(createDemoState(0), delivery));
    const m = s.missions[0];
    expect(m.status).toBe('completed');
    expect(s.robots.find((r) => r.id === m.robotId)?.status).toBe('IDLE');
    expect(s.events.filter((e) => e.type === 'subtask_completed')).toHaveLength(3);
    expect(s.recordings[m.id].frames.slice(-1)[0].status).toBe('completed');
  });
  it('keeps its input state immutable and the idle fleet stationary', () => {
    const initial = createDemoState(0),
      snapshot = structuredClone(initial);
    const next = advance(initial, 10);
    expect(initial).toEqual(snapshot);
    expect(next.robots.map((r) => r.pose)).toEqual(initial.robots.map((r) => r.pose));
  });
  it('does not move during a mission pause or global pause', () => {
    let s = submitMission(createDemoState(0), 'Go to Loading Dock');
    s = setMissionPaused(s, s.missions[0].id, true);
    const poses = structuredClone(s.robots);
    expect(advance(s, 50).robots).toEqual(poses);
    expect(tickFleet({ ...s, running: false })).toEqual({ ...s, running: false });
  });
  it('resumes and cancels without keeping the robot occupied', () => {
    let s = submitMission(createDemoState(0), delivery);
    s = setMissionPaused(s, 'M001', true);
    s = setMissionPaused(s, 'M001', false);
    s = cancelMission(s, 'M001');
    expect(s.missions[0].status).toBe('cancelled');
    expect(s.robots[0].status).toBe('IDLE');
    expect(advance(s, 100).missions[0].status).toBe('cancelled');
  });
  it('never assigns two active missions to one robot', () => {
    let s = createDemoState(0);
    for (let i = 0; i < 3; i++) s = submitMission(s, 'Inspect Ward B');
    expect(new Set(s.missions.map((m) => m.robotId)).size).toBe(3);
    expect(() => submitMission(s, 'Go to Storage')).toThrow('No idle');
  });
  it('fails invalid submissions without consuming IDs or changing robots', () => {
    const s = createDemoState(0);
    expect(() => submitMission(s, 'Go to Unknown')).toThrow();
    expect(s.nextMission).toBe(1);
    expect(s.missions).toHaveLength(0);
  });
});
describe('bounded fault recovery', () => {
  it('waits for the blocked threshold then reassigns once', () => {
    let s = submitMission(createDemoState(0), delivery);
    const old = s.missions[0].robotId;
    s = injectFault(s, old, 'BLOCKED');
    s = advance(s, 29);
    expect(s.missions[0].robotId).toBe(old);
    s = tickFleet(s);
    expect(s.missions[0].robotId).not.toBe(old);
    expect(s.missions[0].retries).toBe(1);
    expect(advance(s).missions[0].status).toBe('completed');
  });
  it('fails visibly when there is no eligible replacement', () => {
    let s = submitMission(createDemoState(0), delivery);
    for (const r of s.robots) s = injectFault(s, r.id, 'BLOCKED');
    s = advance(s, 35);
    expect(s.missions[0].status).toBe('failed');
    expect(s.missions[0].error).toContain('replacement');
  });
  it('enforces the retry budget rather than looping forever', () => {
    let s = submitMission(createDemoState(0), delivery);
    s = injectFault(s, s.missions[0].robotId, 'LOW_BATTERY');
    s = tickFleet(s);
    s = injectFault(s, s.missions[0].robotId, 'LOW_BATTERY');
    s = tickFleet(s);
    expect(s.missions[0].status).toBe('failed');
    expect(s.missions[0].error).toBe('Retry budget exhausted');
  });
  it('does not transfer a picked-up payload without a handoff route', () => {
    let s = submitMission(createDemoState(0), delivery);
    for (let i = 0; i < 600 && !s.missions[0].hasCargo; i++) s = tickFleet(s);
    expect(s.missions[0].hasCargo).toBe(true);
    const old = s.robots.find((r) => r.id === s.missions[0].robotId)!;
    const pose = { ...old.pose };
    s = injectFault(s, old.id, 'LOW_BATTERY');
    s = tickFleet(s);
    expect(s.missions[0].phase).toBe('handoff-travel');
    expect(s.missions[0].route.slice(-1)[0].x).toBeCloseTo(pose.x);
    s = advance(s);
    expect(s.events.some((e) => e.type === 'cargo_handoff')).toBe(true);
    expect(s.missions[0].status).toBe('completed');
  });
  it('allows a faulted robot to be returned to local service', () => {
    let s = createDemoState(0);
    s = injectFault(s, 'AGV-001', 'LOW_BATTERY');
    s = clearFault(s, 'AGV-001');
    expect(s.robots[0].battery).toBe(0.8);
    expect(s.robots[0].status).toBe('IDLE');
    expect(s.faults['AGV-001']).toBeUndefined();
  });
  it('advances identically for repeated fixed-step inputs', () => {
    const s = submitMission(createDemoState(0), delivery);
    expect(advance(s, 150)).toEqual(advance(s, 150));
  });
});

describe('battery service and bounded retention', () => {
  it('records natural depletion and allows a depleted robot to be serviced', () => {
    let s = submitMission(createDemoState(0), 'Go to Pharmacy');
    s.robots[0].battery = 0.20001;
    s = tickFleet(tickFleet(s));
    expect(s.missions[0].robotId).not.toBe('AGV-001');
    expect(s.faults['AGV-001']).toBe('LOW_BATTERY');
    expect(s.robots[0].status).toBe('ERROR');
    s = clearFault(s, 'AGV-001');
    expect(s.robots[0].status).toBe('IDLE');
    expect(s.robots[0].battery).toBe(0.8);
  });
  it('charges at a named station and only completes after reaching the battery target', () => {
    const initial = createDemoState(0);
    initial.robots.forEach((r, i) => {
      r.battery = 0.5 - i * 0.1;
    });
    const s = advance(submitMission(initial, 'Charge'), 400);
    expect(s.missions[0].status).toBe('completed');
    expect(s.robots[0].battery).toBe(0.95);
    expect(s.robots[0].pose.x).toBe(-5);
    expect(s.robots[0].pose.y).toBe(-3);
  });
  it('retains only ten recordings and does not evict an active run', () => {
    let s = submitMission(createDemoState(0), 'Go to Pharmacy');
    s = setMissionPaused(s, 'M001', true);
    for (let i = 0; i < 15; i++) {
      s = submitMission(s, 'Inspect Ward B');
      s = cancelMission(s, s.missions[s.missions.length - 1].id);
    }
    expect(Object.keys(s.recordings)).toHaveLength(10);
    expect(s.recordings.M001).toBeDefined();
  });
});
