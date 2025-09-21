import { nanoid } from 'nanoid';
import { MissionPlan } from './schemas';
import { compileMissionPath } from './planner_path';

type CompileOpts = {
  defaultMinBattery?: number;
  defaultPolicy?: { reassign_on_blocked_s: number; retry_limit: number };
};

type RobotInfo = {
  id: string;
  pose: { x: number; y: number };
  status: string;
  battery: number;
};

export function compileNLToPlan(
  nl: string,
  site_id: string,
  robots: RobotInfo[],
  opts?: CompileOpts
): MissionPlan {
  const mission_id = nanoid();
  const chosen = chooseRobotAuto(robots);
  
  const constraints = {
    priority: 'normal' as const,
    no_go: [],
    time_window_start: null,
    time_window_end: null,
    min_battery_pct: opts?.defaultMinBattery ?? 0.2,
  };
  
  const policy = opts?.defaultPolicy ?? { reassign_on_blocked_s: 10, retry_limit: 1 };
  
  // Simple NL parsing - look for common patterns
  const subtasks = parseNLToSubtasks(nl, policy);
  
  const plan = {
    mission_id,
    site_id,
    natural_language: nl,
    constraints,
    subtasks,
    robot_selection: {
      strategy: 'auto' as const,
      allow_vendors: [],
      include: chosen ? [chosen.id] : [],
      exclude: [],
    },
  };

  return MissionPlan.parse(plan);
}

function chooseRobotAuto(robots: RobotInfo[]) {
  return robots
    .filter(r => r.status === 'IDLE' || r.status === 'ACTIVE')
    .sort((a, b) => b.battery - a.battery)[0] ?? null;
}

function parseNLToSubtasks(nl: string, policy: { reassign_on_blocked_s: number; retry_limit: number }) {
  const lowerNL = nl.toLowerCase();
  const subtasks = [];

  // Simple pattern matching for demo purposes
  if (lowerNL.includes('deliver') || lowerNL.includes('transport')) {
    // Extract locations if possible
    const fromMatch = lowerNL.match(/from\s+([a-zA-Z0-9\s]+?)(?:\s+to|\s+and|$)/);
    const toMatch = lowerNL.match(/to\s+([a-zA-Z0-9\s]+?)(?:\s+and|$)/);
    const itemMatch = lowerNL.match(/(medication|package|supplies|equipment|samples)/);

    const from = fromMatch ? fromMatch[1].trim() : 'Pharmacy';
    const to = toMatch ? toMatch[1].trim() : 'Ward A';
    const item = itemMatch ? itemMatch[1] : 'package';

    // Navigate to pickup location
    subtasks.push({
      id: nanoid(),
      verb: 'navigate' as const,
      args: {
        from: null,
        to: from,
        item: null,
        room: null,
        zone: null,
        dock: null,
      },
      policy,
    });

    // Pickup item
    subtasks.push({
      id: nanoid(),
      verb: 'pickup' as const,
      args: {
        from: from,
        to: null,
        item,
        room: null,
        zone: null,
        dock: null,
      },
      policy,
    });

    // Deliver to destination
    subtasks.push({
      id: nanoid(),
      verb: 'deliver' as const,
      args: {
        from: from,
        to: to,
        item,
        room: null,
        zone: null,
        dock: null,
      },
      policy,
    });
  } else if (lowerNL.includes('inspect') || lowerNL.includes('patrol')) {
    // Inspection mission
    const locationMatch = lowerNL.match(/(room|ward|zone|area)\s+([a-zA-Z0-9\s]+)/);
    const location = locationMatch ? locationMatch[2].trim() : 'Patient Rooms';

    subtasks.push({
      id: nanoid(),
      verb: 'navigate' as const,
      args: {
        from: null,
        to: location,
        item: null,
        room: null,
        zone: location,
        dock: null,
      },
      policy,
    });

    subtasks.push({
      id: nanoid(),
      verb: 'inspect' as const,
      args: {
        from: null,
        to: null,
        item: null,
        room: null,
        zone: location,
        dock: null,
      },
      policy,
    });
  } else {
    // Default fallback mission
    subtasks.push({
      id: nanoid(),
      verb: 'navigate' as const,
      args: {
        from: null,
        to: 'Pharmacy',
        item: null,
        room: null,
        zone: null,
        dock: null,
      },
      policy,
    });

    subtasks.push({
      id: nanoid(),
      verb: 'deliver' as const,
      args: {
        from: null,
        to: 'Ward A',
        item: 'medication',
        room: null,
        zone: null,
        dock: null,
      },
      policy,
    });
  }

  return subtasks;
}