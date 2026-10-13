import { resolveAnchor } from './anchors';
import type { MissionPlan } from '../types';

export interface Obstacle {
  id: string;
  rect: { x: number; y: number; w: number; h: number };
}
export interface NoGo {
  id: string;
  poly: Array<{ x: number; y: number }>;
}
export interface PathPoint {
  x: number;
  y: number;
  theta: number;
}
type Point = { x: number; y: number };
export interface PlanPathOptions {
  start: Point;
  goal: Point;
  obstacles?: Obstacle[];
  noGo?: NoGo[];
  resolutionMeters?: number;
  mapBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

function onSegment(p: Point, a: Point, b: Point): boolean {
  const cross = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
  return (
    Math.abs(cross) < 1e-9 &&
    p.x >= Math.min(a.x, b.x) - 1e-9 &&
    p.x <= Math.max(a.x, b.x) + 1e-9 &&
    p.y >= Math.min(a.y, b.y) - 1e-9 &&
    p.y <= Math.max(a.y, b.y) + 1e-9
  );
}
function intersects(a: Point, b: Point, c: Point, d: Point): boolean {
  const turn = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return (
    (turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0) ||
    onSegment(c, a, b) ||
    onSegment(d, a, b) ||
    onSegment(a, c, d) ||
    onSegment(b, c, d)
  );
}
function inPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (onSegment(p, a, b)) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
export function isSegmentClear(
  a: Point,
  b: Point,
  obstacles: Obstacle[] = [],
  noGo: NoGo[] = []
): boolean {
  const polygons = [
    ...obstacles.map(({ rect: r }) => [
      { x: r.x, y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x, y: r.y + r.h },
    ]),
    ...noGo.map((z) => z.poly),
  ];
  return polygons.every(
    (poly) =>
      !inPolygon(a, poly) &&
      !inPolygon(b, poly) &&
      poly.every((p, i) => !intersects(a, b, p, poly[(i + 1) % poly.length]))
  );
}

/** Four-neighbour A*: Manhattan heuristic, no corner cutting or unsafe fallback. */
export function planPath({
  start,
  goal,
  obstacles = [],
  noGo = [],
  resolutionMeters: r = 0.5,
  mapBounds: b = { minX: -10, maxX: 10, minY: -10, maxY: 10 },
}: PlanPathOptions): PathPoint[] {
  if (
    ![start.x, start.y, goal.x, goal.y, r, b.minX, b.maxX, b.minY, b.maxY].every(Number.isFinite) ||
    r <= 0 ||
    b.maxX <= b.minX ||
    b.maxY <= b.minY
  )
    throw new Error('Invalid route coordinates or grid settings');
  const within = (p: Point) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
  if (!within(start) || !within(goal)) throw new Error('Route endpoint is outside the map');
  if (
    !isSegmentClear(start, start, obstacles, noGo) ||
    !isSegmentClear(goal, goal, obstacles, noGo)
  )
    throw new Error('Route endpoint is blocked');
  const width = Math.floor((b.maxX - b.minX) / r) + 1,
    height = Math.floor((b.maxY - b.minY) / r) + 1;
  if (width * height > 50000) throw new Error('Route grid is too large');
  const cell = (p: Point) => ({
    x: Math.round((p.x - b.minX) / r),
    y: Math.round((p.y - b.minY) / r),
  });
  const world = (x: number, y: number) => ({ x: b.minX + x * r, y: b.minY + y * r });
  const key = (x: number, y: number) => `${x},${y}`;
  const s = cell(start),
    g = cell(goal);
  const sw = world(s.x, s.y),
    gw = world(g.x, g.y);
  if (!isSegmentClear(start, sw, obstacles, noGo) || !isSegmentClear(gw, goal, obstacles, noGo))
    throw new Error('Endpoint cannot connect to the routing grid');
  type Node = { x: number; y: number; cost: number; score: number; parent: Node | null };
  const heuristic = (x: number, y: number) => Math.abs(x - g.x) + Math.abs(y - g.y);
  const open: Node[] = [{ ...s, cost: 0, score: heuristic(s.x, s.y), parent: null }];
  const best = new Map<string, number>([[key(s.x, s.y), 0]]);
  const closed = new Set<string>();
  while (open.length) {
    open.sort((a, b) => a.score - b.score || a.cost - b.cost);
    const node = open.shift()!;
    if (closed.has(key(node.x, node.y))) continue;
    if (node.x === g.x && node.y === g.y) {
      const points: Point[] = [];
      let cursor: Node | null = node;
      while (cursor) {
        points.unshift(world(cursor.x, cursor.y));
        cursor = cursor.parent;
      }
      points.unshift(start);
      points.push(goal);
      const unique = points.filter(
        (p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y
      );
      return addHeadingsToPath(smoothPath(unique));
    }
    closed.add(key(node.x, node.y));
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const x = node.x + dx,
        y = node.y + dy,
        k = key(x, y),
        cost = node.cost + 1;
      if (
        x < 0 ||
        y < 0 ||
        x >= width ||
        y >= height ||
        closed.has(k) ||
        cost >= (best.get(k) ?? Infinity)
      )
        continue;
      if (!isSegmentClear(world(node.x, node.y), world(x, y), obstacles, noGo)) continue;
      best.set(k, cost);
      open.push({ x, y, cost, score: cost + heuristic(x, y), parent: node });
    }
  }
  throw new Error('No reachable route to the requested location');
}

/** Remove only collinear vertices; do not smooth a safe path through obstacles. */
export function smoothPath(points: Point[]): Point[] {
  return points.filter(
    (p, i) => i === 0 || i === points.length - 1 || !onSegment(p, points[i - 1], points[i + 1])
  );
}
export function addHeadingsToPath(points: Point[]): PathPoint[] {
  return points.map((p, i) => {
    const next = points[i + 1] ?? p,
      prev = points[i - 1] ?? p;
    return { ...p, theta: Math.atan2(next.y - prev.y, next.x - prev.x) };
  });
}
export function compileMissionPath(
  _mission: unknown,
  plan: MissionPlan,
  robotPose: Point,
  obstacles: Obstacle[] = [],
  noGo: NoGo[] = []
): PathPoint[] {
  const waypoints: PathPoint[] = [];
  let position = robotPose;
  for (const task of plan.subtasks) {
    const name =
      task.args.to ?? task.args.from ?? task.args.dock ?? task.args.room ?? task.args.zone;
    const target = name ? resolveAnchor(name) : null;
    if (!target) throw new Error(`Unknown mission location: ${name ?? '(missing)'}`);
    const segment = planPath({ start: position, goal: target, obstacles, noGo });
    waypoints.push(...(waypoints.length ? segment.slice(1) : segment));
    position = target;
  }
  return waypoints;
}
