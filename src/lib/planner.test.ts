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

it('keeps a stationary off-grid robot at its destination', () => {
  const point = { x: 1.17, y: -2.13 };
  expect(planPath({ start: point, goal: point, clearanceMeters: 0.65 })).toEqual([
    { ...point, theta: 0 },
  ]);
});

it('keeps equal-cost route choices deterministic around occupied space', () => {
  const options = {
    start: { x: -4, y: 0 },
    goal: { x: 4, y: 0 },
    occupied: [{ x: 0, y: 0, radius: 1.35 }],
    clearanceMeters: 0.65,
  };
  const route = planPath(options);
  expect(planPath(options)).toEqual(route);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1],
      b = route[i];
    expect(
      isSegmentClear(
        a,
        b,
        [],
        [
          {
            id: 'center',
            poly: [
              { x: -0.4, y: -0.4 },
              { x: 0.4, y: -0.4 },
              { x: 0.4, y: 0.4 },
              { x: -0.4, y: 0.4 },
            ],
          },
        ],
        0.65
      )
    ).toBe(true);
  }
});

it('uses one straight segment across an open diagonal', () => {
  const route = planPath({ start: { x: -4, y: -3 }, goal: { x: 6, y: 7 }, clearanceMeters: 0.65 });
  expect(route).toHaveLength(2);
});

it('smooths a wall detour while checking every rounded segment for clearance', () => {
  const obstacles = [{ id: 'wall', rect: { x: -1, y: -2, w: 2, h: 4 } }];
  const route = planPath({
    start: { x: -5, y: 0 },
    goal: { x: 5, y: 0 },
    obstacles,
    clearanceMeters: 0.65,
  });
  expect(route.length).toBeGreaterThan(2);
  for (let i = 1; i < route.length; i++) {
    expect(isSegmentClear(route[i - 1], route[i], obstacles, [], 0.65)).toBe(true);
  }
  const turns = route.slice(1, -1).filter((p, i) => {
    const a = route[i],
      b = route[i + 2];
    const incoming = Math.atan2(p.y - a.y, p.x - a.x);
    const outgoing = Math.atan2(b.y - p.y, b.x - p.x);
    return (
      Math.abs(Math.atan2(Math.sin(outgoing - incoming), Math.cos(outgoing - incoming))) >
      Math.PI / 3
    );
  });
  expect(turns.length).toBeLessThanOrEqual(2);
});
