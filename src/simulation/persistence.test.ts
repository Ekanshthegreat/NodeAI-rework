import { describe, it, expect } from 'vitest';
import { createDemoState, submitMission } from './engine';
import { decodeSnapshot } from './persistence';
describe('saved fleet validation', () => {
  it('round-trips an active mission and its recording', () => {
    const s = submitMission(createDemoState(0), 'Go to Pharmacy');
    expect(decodeSnapshot(JSON.stringify(s))).toEqual(s);
  });
  it('rejects malformed JSON and unknown versions', () => {
    expect(() => decodeSnapshot('{')).toThrow();
    expect(() => decodeSnapshot(JSON.stringify({ ...createDemoState(0), version: 99 }))).toThrow();
  });
  it('rejects invalid robot references and non-finite coordinates', () => {
    const s = submitMission(createDemoState(0), 'Go to Pharmacy');
    s.missions[0].robotId = 'missing';
    expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('references');
    s.robots[0].pose.x = Infinity;
    expect(() => decodeSnapshot(JSON.stringify(s))).toThrow();
  });
  it('rejects out-of-range execution cursors', () => {
    const s = submitMission(createDemoState(0), 'Go to Pharmacy');
    s.missions[0].step = 100;
    expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('references');
  });
  it('rejects duplicate assignments rather than resuming inconsistent work', () => {
    let s = submitMission(createDemoState(0), 'Go to Pharmacy');
    s = submitMission(s, 'Go to Ward A');
    s.missions[1].robotId = s.missions[0].robotId;
    expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('Conflicting');
  });
});

it('rejects reused counters and mismatched plan IDs', () => {
  const s = submitMission(createDemoState(0), 'Go to Pharmacy');
  s.nextMission = 1;
  expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('counters');
  s.nextMission = 2;
  s.missions[0].plan.mission_id = 'other';
  expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('references');
});
it('rejects persisted routes that cross map obstacles', () => {
  const s = submitMission(createDemoState(0), 'Go to Pharmacy');
  s.missions[0].route = [
    { x: 0, y: 0, theta: 0 },
    { x: 0, y: 5, theta: 0 },
  ];
  s.missions[0].waypoint = 1;
  expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('obstacle');
});
it('rejects non-monotonic replay timestamps', () => {
  const s = submitMission(createDemoState(0), 'Go to Pharmacy');
  const frame = s.recordings.M001.frames[0];
  s.recordings.M001.frames = [
    { ...frame, at: 500 },
    { ...frame, at: 100 },
  ];
  expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('timestamps');
});
