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
  clearanceMeters?: number;
  occupied?: Array<Point & { radius: number }>;
  mapBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const squared = dx * dx + dy * dy;
  const t =
    squared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / squared));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
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
export function segmentDistance(a: Point, b: Point, c: Point, d: Point): number {
  if (intersects(a, b, c, d)) return 0;
  return Math.min(
    distanceToSegment(a, c, d),
    distanceToSegment(b, c, d),
    distanceToSegment(c, a, b),
    distanceToSegment(d, a, b)
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
  noGo: NoGo[] = [],
  clearanceMeters = 0
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
      poly.every((p, i) => {
        const q = poly[(i + 1) % poly.length];
        return (
          !intersects(a, b, p, q) &&
          (clearanceMeters === 0 ||
            Math.min(
              distanceToSegment(a, p, q),
              distanceToSegment(b, p, q),
              distanceToSegment(p, a, b),
              distanceToSegment(q, a, b)
            ) >= clearanceMeters)
        );
      })
  );
}

/** Four-neighbour A* with safe endpoint joins and footprint clearance. */
export function planPath({
  start,
  goal,
  obstacles = [],
  noGo = [],
  resolutionMeters: r = 0.5,
  clearanceMeters = 0,
  occupied = [],
  mapBounds: b = { minX: -10, maxX: 10, minY: -10, maxY: 10 },
}: PlanPathOptions): PathPoint[] {
  if (
    ![start.x, start.y, goal.x, goal.y, r, clearanceMeters, b.minX, b.maxX, b.minY, b.maxY].every(
      Number.isFinite
    ) ||
    r <= 0 ||
    clearanceMeters < 0 ||
    occupied.some(
      (disc) => ![disc.x, disc.y, disc.radius].every(Number.isFinite) || disc.radius < 0
    ) ||
    b.maxX <= b.minX ||
    b.maxY <= b.minY
  )
    throw new Error('Invalid route coordinates or grid settings');
  const within = (p: Point) =>
    p.x >= b.minX + clearanceMeters &&
    p.x <= b.maxX - clearanceMeters &&
    p.y >= b.minY + clearanceMeters &&
    p.y <= b.maxY - clearanceMeters;
  const clear = (a: Point, b: Point) =>
    isSegmentClear(a, b, obstacles, noGo, clearanceMeters) &&
    occupied.every((disc) => distanceToSegment(disc, a, b) >= disc.radius - 1e-9);
  if (!within(start) || !within(goal)) throw new Error('Route endpoint is outside the map');
  if (!clear(start, start) || !clear(goal, goal)) throw new Error('Route endpoint is blocked');
  if (start.x === goal.x && start.y === goal.y) return [{ ...start, theta: 0 }];
  const width = Math.floor((b.maxX - b.minX) / r) + 1,
    height = Math.floor((b.maxY - b.minY) / r) + 1;
  if (width * height > 50000) throw new Error('Route grid is too large');
  const cell = (p: Point) => ({
    x: Math.round((p.x - b.minX) / r),
    y: Math.round((p.y - b.minY) / r),
  });
  const world = (x: number, y: number) => ({ x: b.minX + x * r, y: b.minY + y * r });
  const key = (x: number, y: number) => `${x},${y}`;
  // Several safe endpoint connections avoid trapping a robot when its nearest
  // grid vertex is occupied. Every connecting segment has the same clearance checks.
  const connections = (point: Point) => {
    const center = cell(point);
    const nodes: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const node = { x: center.x + dx, y: center.y + dy };
        const p = world(node.x, node.y);
        if (within(p) && clear(point, p)) nodes.push(node);
      }
    return nodes;
  };
  const starts = connections(start),
    goals = connections(goal);
  if (!starts.length || !goals.length)
    throw new Error('Endpoint cannot connect to the routing grid');
  const goalKeys = new Set(goals.map((p) => key(p.x, p.y)));
  type Node = {
    x: number;
    y: number;
    cost: number;
    score: number;
    parent: Node | null;
    order: number;
  };
  const open: Node[] = [];
  let nextOrder = 0;
  const earlier = (a: Node, b: Node) =>
    a.score < b.score ||
    (a.score === b.score && (a.cost < b.cost || (a.cost === b.cost && a.order < b.order)));
  const push = (value: Omit<Node, 'order'>) => {
    const node = { ...value, order: nextOrder++ };
    let index = open.length;
    open.push(node);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!earlier(node, open[parent])) break;
      open[index] = open[parent];
      index = parent;
    }
    open[index] = node;
  };
  const pop = (): Node => {
    const first = open[0],
      last = open.pop()!;
    if (open.length) {
      let index = 0;
      while (index * 2 + 1 < open.length) {
        let child = index * 2 + 1;
        if (child + 1 < open.length && earlier(open[child + 1], open[child])) child++;
        if (!earlier(open[child], last)) break;
        open[index] = open[child];
        index = child;
      }
      open[index] = last;
    }
    return first;
  };
  const heuristic = (x: number, y: number) =>
    Math.hypot(world(x, y).x - goal.x, world(x, y).y - goal.y) / r;
  starts.forEach((node) => {
    const p = world(node.x, node.y);
    const cost = Math.hypot(p.x - start.x, p.y - start.y) / r;
    push({ ...node, cost, score: cost + heuristic(node.x, node.y), parent: null });
  });
  const best = new Map<string, number>(open.map((node) => [key(node.x, node.y), node.cost]));
  const closed = new Set<string>();
  while (open.length) {
    const node = pop();
    if (closed.has(key(node.x, node.y))) continue;
    if (goalKeys.has(key(node.x, node.y))) {
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
      if (!within(world(x, y)) || !clear(world(node.x, node.y), world(x, y))) continue;
      best.set(k, cost);
      push({ x, y, cost, score: cost + heuristic(x, y), parent: node });
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
