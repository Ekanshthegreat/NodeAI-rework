import { describe, it, expect } from 'vitest';
import {
  createDemoState,
  submitMission,
  tickFleet,
  cancelMission,
  setMissionPaused,
} from './engine';
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

describe('recorded fleet integrity', () => {
  it.each(['duplicate', 'unknown', 'missing', 'wrong-site', 'step'])(
    'rejects a %s recorded fleet state',
    (corruption) => {
      const s = submitMission(createDemoState(0), 'Go to Pharmacy');
      const frame = s.recordings.M001.frames[0];
      if (corruption === 'duplicate') frame.robots[1].id = frame.robots[0].id;
      if (corruption === 'unknown') frame.robots[1].id = 'missing';
      if (corruption === 'missing') frame.robots = [];
      if (corruption === 'wrong-site') frame.robots[0].site_id = 'other';
      if (corruption === 'step') frame.step = 100;
      expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('recorded fleet');
    }
  );
  it('rejects a frame from the future', () => {
    const s = submitMission(createDemoState(0), 'Go to Pharmacy');
    s.recordings.M001.frames[0].at = s.elapsedMs + 1;
    expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('timestamps');
  });
  it.each(['ownership', 'robot', 'future', 'counter', 'duplicate', 'time-order'])(
    'rejects recorded event %s corruption',
    (corruption) => {
      let s = submitMission(createDemoState(0), 'Go to Pharmacy');
      s = tickFleet(s);
      s = cancelMission(s, 'M001');
      // Keep corruption local to the recording, not the shared live event object.
      s.recordings.M001.events = structuredClone(s.recordings.M001.events);
      const events = s.recordings.M001.events;
      if (corruption === 'ownership') events[0].missionId = 'M999';
      if (corruption === 'robot') events[0].robotId = 'missing';
      if (corruption === 'future') events[1].at = s.elapsedMs + 1;
      if (corruption === 'counter') events[1].sequence = s.nextEvent;
      if (corruption === 'duplicate') events[1].sequence = events[0].sequence;
      if (corruption === 'time-order') events[0].at = s.elapsedMs;
      if (corruption === 'time-order') events[1].at = 0;
      expect(() => decodeSnapshot(JSON.stringify(s))).toThrow('recorded event');
    }
  );
  it('accepts completed and pause/resume/cancel recordings', () => {
    let completed = submitMission(createDemoState(0), 'Go to Pharmacy');
    for (let i = 0; i < 600 && completed.missions[0].status === 'active'; i++)
      completed = tickFleet(completed);
    expect(completed.missions[0].status).toBe('completed');
    expect(decodeSnapshot(JSON.stringify(completed))).toEqual(completed);
    let paused = submitMission(createDemoState(0), 'Go to Pharmacy');
    paused = setMissionPaused(paused, 'M001', true);
    paused = setMissionPaused(paused, 'M001', false);
    paused = cancelMission(paused, 'M001');
    expect(decodeSnapshot(JSON.stringify(paused))).toEqual(paused);
  });
});
