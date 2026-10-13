import type { MissionPlan } from './schemas';
import type { Robot } from '../types';

// Global state for tracking robot stuck status
const stuckMap = new Map<string, number>(); // robotId -> timestamp when stuck started
const progressMap = new Map<string, number>(); // robotId -> last progress timestamp

export function trackRobotStuck(robotId: string, isStuck: boolean, now: number): void {
  if (isStuck) {
    if (!stuckMap.has(robotId)) {
      stuckMap.set(robotId, now);
    }
  } else {
    stuckMap.delete(robotId);
    progressMap.set(robotId, now);
  }
}

export function getRobotStuckDuration(robotId: string, now: number): number {
  const stuckSince = stuckMap.get(robotId);
  if (!stuckSince) return 0;
  return Math.max(0, (now - stuckSince) / 1000); // Convert to seconds
}

export function markRobotProgress(robotId: string, progressing: boolean, now: number): void {
  if (progressing) {
    progressMap.set(robotId, now);
    stuckMap.delete(robotId);
  }
}

interface PolicyContext {
  robots: Robot[];
  getMissionPlan: (missionId: string) => MissionPlan | null;
  setMissionPlan: (missionId: string, plan: MissionPlan) => void;
  now: () => number;
}

export async function maybeReplan(
  reason: 'BLOCKED' | 'LOW_BATTERY',
  missionId: string,
  context: PolicyContext
): Promise<MissionPlan | null> {
  const { robots, getMissionPlan, setMissionPlan } = context;

  const currentPlan = getMissionPlan(missionId);
  if (!currentPlan) return null;

  // Find available robots for reassignment
  const availableRobots = robots.filter((robot) => {
    // Skip the currently assigned robot
    if (currentPlan.robot_selection.include.includes(robot.id)) {
      return false;
    }

    // Check if robot meets requirements
    if (reason === 'LOW_BATTERY' && robot.battery < currentPlan.constraints.min_battery_pct) {
      return false;
    }

    if (robot.status === 'ERROR' || robot.status === 'BLOCKED') {
      return false;
    }

    return robot.status === 'IDLE' || robot.status === 'ACTIVE';
  });

  if (availableRobots.length === 0) {
    console.warn(`No available robots for replan of mission ${missionId}`);
    return null;
  }

  // Choose best robot (highest battery, prefer IDLE)
  const bestRobot = availableRobots.sort((a, b) => {
    // Prefer IDLE over ACTIVE
    if (a.status === 'IDLE' && b.status !== 'IDLE') return -1;
    if (b.status === 'IDLE' && a.status !== 'IDLE') return 1;

    // Then by battery level
    return b.battery - a.battery;
  })[0];

  // Create new plan with reassigned robot
  const newPlan: MissionPlan = {
    ...currentPlan,
    robot_selection: {
      ...currentPlan.robot_selection,
      include: [bestRobot.id],
    },
  };

  // Update the plan
  setMissionPlan(missionId, newPlan);

  console.log(`Replanned mission ${missionId}: ${reason} -> assigned to ${bestRobot.id}`);

  return newPlan;
}

export function evaluatePoliciesOnTick(_now: number): void {
  // This function is called periodically to evaluate policies
  // The main policy evaluation happens in the usePolicyEngine hook
  // This is just a placeholder for any global policy checks
}
