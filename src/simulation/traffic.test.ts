import { describe, expect, it } from 'vitest';
import {
  createDemoState,
  submitMission,
  tickFleet,
  setMissionPaused,
  type FleetState,
} from './engine';
import { distanceToSegment, isSegmentClear, planPath } from '../lib/planner_path';
import { movementBlocker, ROBOT_RADIUS, ROBOT_SEPARATION } from './traffic';
import { decodeSnapshot } from './persistence';

function assertMotion(before: FleetState, after: FleetState) {
  for (let i = 0; i < after.robots.length; i++) {
    const a = after.robots[i],
      previousA = before.robots[i];
    expect(
      isSegmentClear(previousA.pose, a.pose, after.site.obstacles, after.site.noGo, ROBOT_RADIUS)
    ).toBe(true);
    for (let j = i + 1; j < after.robots.length; j++) {
      const b = after.robots[j],
        previousB = before.robots[j];
      // Minimum separation throughout this tick, including a crossing between endpoints.
      const distance = distanceToSegment(
        { x: 0, y: 0 },
        { x: previousA.pose.x - previousB.pose.x, y: previousA.pose.y - previousB.pose.y },
        { x: a.pose.x - b.pose.x, y: a.pose.y - b.pose.y }
      );
      expect(distance).toBeGreaterThanOrEqual(ROBOT_SEPARATION - 1e-8);
    }
  }
}
function run(initial: FleetState, ticks = 1000) {
  let state = initial;
  for (let i = 0; i < ticks && state.missions.some((m) => m.status === 'active'); i++) {
    const next = tickFleet(state);
    assertMotion(state, next);
    state = next;
  }
  return state;
}
function encounter(starts: { x: number; y: number }[], goals: { x: number; y: number }[]) {
  let state = createDemoState(0);
  state.site.obstacles = [];
  state.site.noGo = [];
  state.robots.forEach((robot, i) => {
    robot.pose = { ...(starts[i] ?? { x: 8, y: 8 }), theta: 0 };
  });
  for (const goal of goals) {
    state = submitMission(state, 'Go to Loading Dock');
    const mission = state.missions[state.missions.length - 1];
    const robot = state.robots.find((r) => r.id === mission.robotId)!;
    // Deliberately intersecting legacy routes exercise the movement guard and rerouter.
    mission.route = planPath({ start: robot.pose, goal });
    mission.waypoint = 1;
  }
  return state;
}

describe('fleet traffic', () => {
  it('reroutes around an idle robot and completes the delivery', () => {
    const state = run(
      submitMission(createDemoState(0), 'Deliver supplies from Pharmacy to Ward A')
    );
    expect(state.missions[0].status).toBe('completed');
  });
  it('keeps a body-width gap at walls and polygon boundaries', () => {
    const state = run(submitMission(createDemoState(0), 'Inspect Ward B'));
    expect(state.missions[0].status).toBe('completed');
  });
  it('resolves a head-on encounter without swapping through each other', () => {
    const state = run(
      encounter(
        [
          { x: -3, y: 0 },
          { x: 3, y: 0 },
        ],
        [
          { x: 3, y: 0 },
          { x: -3, y: 0 },
        ]
      )
    );
    expect(state.missions.map((m) => m.status)).toEqual(['completed', 'completed']);
    expect(state.events.some((e) => e.type === 'traffic_wait')).toBe(true);
  });
  it('lets crossing routes finish while maintaining separation between ticks', () => {
    const state = run(
      encounter(
        [
          { x: -3, y: 0 },
          { x: 0, y: -3 },
        ],
        [
          { x: 3, y: 0 },
          { x: 0, y: 3 },
        ]
      )
    );
    expect(state.missions.map((m) => m.status)).toEqual(['completed', 'completed']);
  });
  it('uses separate stopping positions for three missions at one location', () => {
    let state = createDemoState(0);
    for (let i = 0; i < 3; i++) state = submitMission(state, 'Inspect Ward B');
    state = run(state);
    expect(state.missions.map((m) => m.status)).toEqual(['completed', 'completed', 'completed']);
    expect(decodeSnapshot(JSON.stringify(state))).toEqual(state);
  });
  it('routes around paused robots without changing their positions', () => {
    let state = encounter(
      [
        { x: 0, y: 0 },
        { x: -3, y: 0 },
      ],
      [
        { x: 5, y: 0 },
        { x: 3, y: 0 },
      ]
    );
    state = setMissionPaused(state, 'M001', true);
    const paused = { ...state.robots[0].pose };
    state = run(state);
    expect(state.robots[0].pose).toEqual(paused);
    expect(state.missions[1].status).toBe('completed');
  });
  it('blocks a swept crossing even if both endpoints are outside the other robot', () => {
    const state = createDemoState(0);
    state.robots[1].pose = { x: 0, y: 0, theta: 0 };
    expect(
      movementBlocker(
        state.site,
        state.robots[0],
        { x: -3, y: 0 },
        { x: 3, y: 0 },
        state.robots,
        []
      )
    ).toBe('AGV-002');
  });
});

it('rejects overlapping live snapshots while keeping older safe snapshots readable', () => {
  let state = submitMission(createDemoState(0), 'Go to Pharmacy');
  delete state.missions[0].traffic;
  state = decodeSnapshot(JSON.stringify(state));
  expect(run(state).missions[0].status).toBe('completed');
  state.robots[1].pose = { ...state.robots[0].pose };
  expect(() => decodeSnapshot(JSON.stringify(state))).toThrow('overlap');
});

it('holds a blocked passage until a paused robot moves', () => {
  let state = encounter(
    [
      { x: 0, y: 0 },
      { x: -3, y: 0 },
    ],
    [
      { x: 5, y: 0 },
      { x: 3, y: 0 },
    ]
  );
  state.site.obstacles = [
    { id: 'north-wall', rect: { x: -5, y: 0.9, w: 10, h: 8 } },
    { id: 'south-wall', rect: { x: -5, y: -8.9, w: 10, h: 8 } },
  ];
  state = setMissionPaused(state, 'M001', true);
  state = run(state, 80);
  expect(state.missions[1].traffic?.waitingFor).toBe('AGV-001');
  expect(state.robots[1].pose.x).toBeLessThan(-ROBOT_SEPARATION);
  expect(state.missions[1].retries).toBe(0);
  state = setMissionPaused(state, 'M001', false);
  state = run(state);
  expect(state.missions.map((m) => m.status)).toEqual(['completed', 'completed']);
});

it.each([
  ['Go to Storage', 'Go to Pharmacy', 'Inspect Ward A'],
  ['Go to Loading Dock', 'Charge', 'Inspect Ward B'],
  ['Deliver supplies from Pharmacy to Ward A', 'Inspect Ward B', 'Go to Storage'],
])('finishes a mixed fleet run starting with %s', (a, b, c) => {
  let state = createDemoState(0);
  for (const command of [a, b, c]) state = submitMission(state, command);
  state = run(state);
  expect(state.missions.every((m) => m.status === 'completed')).toBe(true);
});
