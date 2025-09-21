import { nanoid } from 'nanoid';
import { MissionPlan } from './schemas';
import { recordReplan } from './db';

export type PolicyContext = {
  robots: Array<{
    id: string;
    battery: number;
    status: string;
    pose: { x: number; y: number };
  }>;
  getMissionPlan: (mission_id: string) => MissionPlan | null;
  setMissionPlan: (mission_id: string, plan: MissionPlan) => void;
  now: () => number;
};

export async function maybeReplan(
  reason: 'BLOCKED' | 'LOW_BATTERY',
  mission_id: string,
  ctx: PolicyContext
): Promise<MissionPlan | null> {
  const oldPlan = ctx.getMissionPlan(mission_id);
  if (!oldPlan) return null;

  let newPlan: MissionPlan | null = null;

  if (reason === 'LOW_BATTERY') {
    // Insert a charge subtask at the head for current robot, handoff remaining to a new robot
    const replacement = pickReplacement(ctx.robots, oldPlan.constraints.min_battery_pct);
    if (!replacement) return null;

    newPlan = {
      ...oldPlan,
      subtasks: [
        {
          id: nanoid(),
          verb: 'charge',
          args: {
            from: null,
            to: null,
            item: null,
            room: null,
            zone: null,
            dock: 'dock-1',
          },
          policy: { reassign_on_blocked_s: 10, retry_limit: 1 },
        },
        ...oldPlan.subtasks.slice(1),
      ],
      robot_selection: {
        ...oldPlan.robot_selection,
        include: [replacement.id],
      },
    };
  } else if (reason === 'BLOCKED') {
    const replacement = pickReplacement(ctx.robots, oldPlan.constraints.min_battery_pct);
    if (!replacement) return null;

    newPlan = {
      ...oldPlan,
      robot_selection: {
        ...oldPlan.robot_selection,
        include: [replacement.id],
      },
    };
  }

  if (newPlan) {
    ctx.setMissionPlan(mission_id, newPlan);
    await recordReplan(mission_id, reason, oldPlan, newPlan);
  }

  return newPlan;
}

function pickReplacement(
  robots: Array<{ id: string; battery: number; status: string }>,
  minBattery: number
) {
  return (
    robots
      .filter(r => (r.status === 'IDLE' || r.status === 'ACTIVE') && r.battery >= minBattery)
      .sort((a, b) => b.battery - a.battery)[0] ?? null
  );
}

// Track robot stuck states for policy enforcement
const robotStuckStates = new Map<string, number>();

export function trackRobotStuck(robotId: string, isBlocked: boolean, now: number) {
  if (isBlocked) {
    if (!robotStuckStates.has(robotId)) {
      robotStuckStates.set(robotId, now);
    }
  } else {
    robotStuckStates.delete(robotId);
  }
}

export function getRobotStuckDuration(robotId: string, now: number): number {
  const stuckSince = robotStuckStates.get(robotId);
  return stuckSince ? (now - stuckSince) / 1000 : 0; // Return seconds
}

export function clearRobotStuckState(robotId: string) {
  robotStuckStates.delete(robotId);
}