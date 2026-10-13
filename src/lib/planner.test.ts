import { describe, it, expect } from 'vitest';
import { planPath, isSegmentClear } from './planner_path';
import { compileNLToPlan } from './planner';
const robot = { id: 'r1', pose: { x: 0, y: 0 }, status: 'IDLE', battery: 0.8 };
describe('mission compilation', () => {
  it('retains pickup and delivery locations in a typed plan', () => {
    const p = compileNLToPlan('Deliver supplies from pharmacy to Ward A', 'site', [robot]);
    expect(p.subtasks.map((t) => t.verb)).toEqual(['navigate', 'pickup', 'deliver']);
    expect(p.subtasks[2].args.to).toBe('Ward A');
  });
  it('supports sequential commands', () =>
    expect(
      compileNLToPlan('Go to Loading Dock then Inspect Ward B', 'site', [robot]).subtasks
    ).toHaveLength(2));
  it('rejects unknown instructions and locations', () => {
    expect(() => compileNLToPlan('do something clever', 'site', [robot])).toThrow('Use');
    expect(() => compileNLToPlan('Go to Atlantis', 'site', [robot])).toThrow('Unknown location');
  });
  it('does not assign busy or low-battery robots', () => {
    expect(() => compileNLToPlan('Charge', 'site', [{ ...robot, status: 'ACTIVE' }])).toThrow(
      'No idle'
    );
    expect(() => compileNLToPlan('Charge', 'site', [{ ...robot, battery: 0.1 }])).toThrow(
      'No idle'
    );
  });
});
describe('obstacle-aware routing', () => {
  it('routes around a wall without cutting corners', () => {
    const obstacles = [{ id: 'wall', rect: { x: 1, y: -1, w: 1, h: 2 } }];
    const path = planPath({ start: { x: 0, y: 0 }, goal: { x: 3, y: 0 }, obstacles });
    expect(path[0].x).toBe(0);
    expect(path[path.length - 1]?.x).toBe(3);
    for (let i = 1; i < path.length; i++)
      expect(isSegmentClear(path[i - 1], path[i], obstacles)).toBe(true);
  });
  it('refuses unreachable routes instead of crossing a wall', () =>
    expect(() =>
      planPath({
        start: { x: 0, y: 0 },
        goal: { x: 3, y: 0 },
        obstacles: [{ id: 'wall', rect: { x: 1, y: -10, w: 1, h: 20 } }],
      })
    ).toThrow('No reachable'));
  it('rejects blocked goals, non-finite inputs and invalid resolutions', () => {
    expect(() =>
      planPath({
        start: { x: 0, y: 0 },
        goal: { x: 1, y: 1 },
        obstacles: [{ id: 'o', rect: { x: 0.5, y: 0.5, w: 1, h: 1 } }],
      })
    ).toThrow('blocked');
    expect(() => planPath({ start: { x: NaN, y: 0 }, goal: { x: 0, y: 0 } })).toThrow('Invalid');
    expect(() =>
      planPath({ start: { x: 0, y: 0 }, goal: { x: 0, y: 0 }, resolutionMeters: 0 })
    ).toThrow('Invalid');
  });
  it('keeps polygon no-go boundaries out of every segment', () => {
    const noGo = [
      {
        id: 'zone',
        poly: [
          { x: 1, y: -1 },
          { x: 2, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    ];
    const path = planPath({ start: { x: 0, y: 0 }, goal: { x: 3, y: 0 }, noGo });
    for (let i = 1; i < path.length; i++)
      expect(isSegmentClear(path[i - 1], path[i], [], noGo)).toBe(true);
  });
  it('supports a goal on the outer map boundary', () =>
    expect(planPath({ start: { x: 9, y: 0 }, goal: { x: 10, y: 0 } }).slice(-1)[0].x).toBe(10));
});
