import { resolveAnchor } from './anchors';

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

export interface PlanPathOptions {
  start: { x: number; y: number };
  goal: { x: number; y: number };
  obstacles?: Obstacle[];
  noGo?: NoGo[];
  resolutionMeters?: number;
  mapBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

// Simple A* implementation for coarse grid pathfinding
export function planPath(options: PlanPathOptions): PathPoint[] {
  const {
    start,
    goal,
    obstacles = [],
    noGo = [],
    resolutionMeters = 0.5,
    mapBounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 },
  } = options;

  // Create grid
  const gridWidth = Math.ceil((mapBounds.maxX - mapBounds.minX) / resolutionMeters);
  const gridHeight = Math.ceil((mapBounds.maxY - mapBounds.minY) / resolutionMeters);
  
  // Convert world coordinates to grid coordinates
  const worldToGrid = (x: number, y: number) => ({
    x: Math.floor((x - mapBounds.minX) / resolutionMeters),
    y: Math.floor((y - mapBounds.minY) / resolutionMeters),
  });
  
  const gridToWorld = (gx: number, gy: number) => ({
    x: mapBounds.minX + gx * resolutionMeters,
    y: mapBounds.minY + gy * resolutionMeters,
  });
  
  // Check if a grid cell is blocked
  const isBlocked = (gx: number, gy: number): boolean => {
    if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return true;
    
    const world = gridToWorld(gx, gy);
    
    // Check obstacles
    for (const obstacle of obstacles) {
      const { x, y, w, h } = obstacle.rect;
      if (world.x >= x && world.x <= x + w && world.y >= y && world.y <= y + h) {
        return true;
      }
    }
    
    // Check no-go zones (simplified point-in-polygon)
    for (const zone of noGo) {
      if (pointInPolygon(world, zone.poly)) {
        return true;
      }
    }
    
    return false;
  };
  
  const startGrid = worldToGrid(start.x, start.y);
  const goalGrid = worldToGrid(goal.x, goal.y);
  
  // A* algorithm
  interface Node {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    parent: Node | null;
  }
  
  const openSet: Node[] = [];
  const closedSet = new Set<string>();
  
  const heuristic = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  
  const startNode: Node = {
    x: startGrid.x,
    y: startGrid.y,
    g: 0,
    h: heuristic(startGrid, goalGrid),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  
  openSet.push(startNode);
  
  const neighbors = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];
  
  while (openSet.length > 0) {
    // Find node with lowest f score
    let current = openSet[0];
    let currentIndex = 0;
    
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < current.f) {
        current = openSet[i];
        currentIndex = i;
      }
    }
    
    openSet.splice(currentIndex, 1);
    closedSet.add(`${current.x},${current.y}`);
    
    // Check if we reached the goal
    if (current.x === goalGrid.x && current.y === goalGrid.y) {
      // Reconstruct path
      const path: { x: number; y: number }[] = [];
      let node: Node | null = current;
      
      while (node) {
        const world = gridToWorld(node.x, node.y);
        path.unshift(world);
        node = node.parent;
      }
      
      // Smooth path and add headings
      const smoothed = smoothPath(path);
      return addHeadingsToPath(smoothed);
    }
    
    // Check neighbors
    for (const [dx, dy] of neighbors) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      
      if (isBlocked(nx, ny) || closedSet.has(`${nx},${ny}`)) {
        continue;
      }
      
      const g = current.g + Math.sqrt(dx * dx + dy * dy);
      const h = heuristic({ x: nx, y: ny }, goalGrid);
      const f = g + h;
      
      // Check if this path to neighbor is better
      const existingIndex = openSet.findIndex(n => n.x === nx && n.y === ny);
      
      if (existingIndex === -1) {
        openSet.push({
          x: nx,
          y: ny,
          g,
          h,
          f,
          parent: current,
        });
      } else if (g < openSet[existingIndex].g) {
        openSet[existingIndex].g = g;
        openSet[existingIndex].f = f;
        openSet[existingIndex].parent = current;
      }
    }
  }
  
  // No path found, return direct line
  console.warn('No path found, using direct line');
  return addHeadingsToPath([start, goal]);
}

// Simplified Ramer-Douglas-Peucker algorithm
export function smoothPath(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  
  const epsilon = 0.3; // meters
  
  const rdp = (pts: { x: number; y: number }[], start: number, end: number): { x: number; y: number }[] => {
    if (end - start <= 1) return [pts[start], pts[end]];
    
    let maxDist = 0;
    let maxIndex = start;
    
    for (let i = start + 1; i < end; i++) {
      const dist = pointToLineDistance(pts[i], pts[start], pts[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    
    if (maxDist > epsilon) {
      const left = rdp(pts, start, maxIndex);
      const right = rdp(pts, maxIndex, end);
      return [...left.slice(0, -1), ...right];
    }
    
    return [pts[start], pts[end]];
  };
  
  return rdp(points, 0, points.length - 1);
}

export function addHeadingsToPath(points: { x: number; y: number }[]): PathPoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0], theta: 0 }];
  
  const result: PathPoint[] = [];
  
  for (let i = 0; i < points.length; i++) {
    let theta = 0;
    
    if (i < points.length - 1) {
      // Use direction to next point
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      theta = Math.atan2(dy, dx);
    } else {
      // Last point, use direction from previous point
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      theta = Math.atan2(dy, dx);
    }
    
    result.push({ ...points[i], theta });
  }
  
  return result;
}

// Helper functions
function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (
      polygon[i].y > point.y !== polygon[j].y > point.y &&
      point.x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / (polygon[j].y - polygon[i].y) + polygon[i].x
    ) {
      inside = !inside;
    }
  }
  
  return inside;
}

function pointToLineDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  let param = dot / lenSq;
  
  let xx, yy;
  
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

// Mission path compilation
export function compileMissionPath(
  _mission: any,
  plan: any,
  robotPose: { x: number; y: number },
  obstacles: Obstacle[] = [],
  noGo: NoGo[] = []
): PathPoint[] {
  const waypoints: PathPoint[] = [];
  let currentPos = robotPose;
  
  for (const subtask of plan.subtasks) {
    let targetPos: { x: number; y: number } | null = null;
    
    // Resolve target location
    if (subtask.args.to) {
      targetPos = resolveAnchor(subtask.args.to);
    } else if (subtask.args.from) {
      targetPos = resolveAnchor(subtask.args.from);
    } else if (subtask.args.dock) {
      targetPos = resolveAnchor(subtask.args.dock);
    } else if (subtask.args.room) {
      targetPos = resolveAnchor(subtask.args.room);
    } else if (subtask.args.zone) {
      targetPos = resolveAnchor(subtask.args.zone);
    }
    
    if (!targetPos) {
      console.warn(`Could not resolve target for subtask ${subtask.id}, using fallback`);
      targetPos = { x: 0, y: 0 }; // Fallback to origin
    }
    
    // Plan path segment
    const segmentPath = planPath({
      start: currentPos,
      goal: targetPos,
      obstacles,
      noGo,
    });
    
    // Add segment to overall path (skip first point if not the first segment)
    if (waypoints.length === 0) {
      waypoints.push(...segmentPath);
    } else {
      waypoints.push(...segmentPath.slice(1));
    }
    
    currentPos = targetPos;
  }
  
  return waypoints;
}