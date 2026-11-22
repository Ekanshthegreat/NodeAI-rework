import type { Robot, Site } from '../types';
import { distanceToSegment, segmentDistance, isSegmentClear } from '../lib/planner_path';

// The 0.95 × 0.77 m model fits inside this disc at every heading.
export const ROBOT_RADIUS = 0.65;
export const ROBOT_SEPARATION = 1.35;
export type Point = { x: number; y: number };
export interface Movement {
  robotId: string;
  from: Point;
  to: Point;
}

export function movementBlocker(
  site: Site,
  robot: Robot,
  from: Point,
  to: Point,
  robots: Robot[],
  movements: Movement[]
): string | null {
  if (
    Math.abs(to.x) > 10 - ROBOT_RADIUS ||
    Math.abs(to.y) > 10 - ROBOT_RADIUS ||
    !isSegmentClear(from, to, site.obstacles, site.noGo, ROBOT_RADIUS)
  )
    return 'map clearance';
  for (const other of robots) {
    if (
      other.id !== robot.id &&
      other.site_id === robot.site_id &&
      distanceToSegment(other.pose, from, to) < ROBOT_SEPARATION - 1e-9
    )
      return other.id;
  }
  for (const movement of movements) {
    if (movement.robotId === robot.id) continue;
    if (segmentDistance(from, to, movement.from, movement.to) < ROBOT_SEPARATION - 1e-9)
      return movement.robotId;
  }
  return null;
}

export function occupiedRobots(robots: Robot[], robot: Robot) {
  return robots
    .filter((other) => other.id !== robot.id && other.site_id === robot.site_id)
    .map((other) => ({ x: other.pose.x, y: other.pose.y, radius: ROBOT_SEPARATION }));
}
