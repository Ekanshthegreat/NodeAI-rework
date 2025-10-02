import { adapters } from '../adapters';
import type { MissionPlan, Robot, EventMessage } from '../types';

export async function dispatchMissionToRobot(
  mission: MissionPlan,
  robot: Robot,
  onEvent: (e: EventMessage) => void
): Promise<void> {
  const adapter = adapters[robot.vendor];

  if (!adapter) {
    throw new Error(`No adapter found for vendor: ${robot.vendor}`);
  }

  onEvent({
    ts: Date.now(),
    level: 'INFO',
    msg: `[DISPATCH] Routing mission to ${robot.vendor}:${robot.id}:${mission.mission_id}`,
    payload: {
      mission_id: mission.mission_id,
      robot_id: robot.id,
      vendor: robot.vendor
    }
  });

  await adapter.sendMission(mission);
}

export async function dispatchMissionToRobots(
  mission: MissionPlan,
  robots: Robot[],
  onEvent: (e: EventMessage) => void
): Promise<void> {
  const robotsByVendor = robots.reduce((acc, robot) => {
    if (!acc[robot.vendor]) {
      acc[robot.vendor] = [];
    }
    acc[robot.vendor].push(robot);
    return acc;
  }, {} as Record<string, Robot[]>);

  for (const [vendor, vendorRobots] of Object.entries(robotsByVendor)) {
    const adapter = adapters[vendor];
    if (!adapter) {
      onEvent({
        ts: Date.now(),
        level: 'ERROR',
        msg: `[DISPATCH] No adapter found for vendor: ${vendor}`,
        payload: { vendor, robot_ids: vendorRobots.map(r => r.id) }
      });
      continue;
    }

    onEvent({
      ts: Date.now(),
      level: 'INFO',
      msg: `[DISPATCH] Routing mission to ${vendor}:[${vendorRobots.map(r => r.id).join(', ')}]:${mission.mission_id}`,
      payload: {
        mission_id: mission.mission_id,
        robot_ids: vendorRobots.map(r => r.id),
        vendor
      }
    });

    await adapter.sendMission(mission);
  }
}
