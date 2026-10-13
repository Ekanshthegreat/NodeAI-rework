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
