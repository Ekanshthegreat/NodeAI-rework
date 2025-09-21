import { MissionPlan } from './schemas';
import { nanoid } from 'nanoid';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'react-hot-toast';

// In-memory helper to track when a robot became stuck
const stuckMap = new Map<string, number>(); // robotId -> ts when stuck began

export function markRobotProgress(robotId: string, progressing: boolean, now: number) {
  if (progressing) {
    stuckMap.delete(robotId);
  } else if (!stuckMap.has(robotId)) {
    stuckMap.set(robotId, now);
  }
}

export function evaluatePoliciesOnTick(now: number) {
  const s = useAppStore.getState();
  if (!s.policy.selfHealEnabled) return;

  // For each active mission with a plan, check the current assigned/selected robot
  Object.entries(s.missionPlans).forEach(([mission_id, plan]) => {
    const mission = s.missions.find(m => m.id === mission_id);
    if (!mission || mission.status !== 'active') return;

    const robots = s.robots.filter(r => r.site_id === plan.site_id);
    const selectedId = plan.robot_selection.include[0] ?? null;
    const selected = robots.find(r => r.id === selectedId);

    if (!selected) return;

    // Battery policy
    if (selected.battery < plan.constraints.min_battery_pct) {
      const newPlan = replanForLowBattery(plan, robots);
      if (newPlan) {
        applyReplan(mission_id, plan, newPlan, 'LOW_BATTERY', now);
        return;
      }
    }

    // Blocked policy: detect stuck pose based on stuckSince tracker
    const stuckSince = stuckMap.get(selected.id) ?? 0;
    if (stuckSince > 0) {
      const blockedS = s.policy.defaultBlockedSeconds;
      if (now - stuckSince >= blockedS * 1000) {
        const newPlan = reassignOnBlocked(plan, robots);
        if (newPlan) {
          applyReplan(mission_id, plan, newPlan, 'BLOCKED', now);
        }
      }
    }
  });
}

// Replan strategies
function pickReplacement(
  robots: Array<{
    id: string;
    battery: number;
    status: string;
    capabilities?: string[];
  }>,
  min: number,
  requiredPlugins: string[]
) {
  return (
    robots
      .filter(
        r =>
          (r.status === 'IDLE' || r.status === 'ACTIVE') &&
          r.battery >= min &&
          requiredPlugins.every(p =>
            (r.capabilities ?? ['delivery', 'dock']).includes(p)
          )
      )
      .sort((a, b) => b.battery - a.battery)[0] ?? null
  );
}

function reassignOnBlocked(plan: MissionPlan, robots: any[]): MissionPlan | null {
  const required = ['delivery'];
  const replacement = pickReplacement(robots, plan.constraints.min_battery_pct, required);
  if (!replacement) return null;

  return {
    ...plan,
    robot_selection: { ...plan.robot_selection, include: [replacement.id] },
  };
}

function replanForLowBattery(plan: MissionPlan, robots: any[]): MissionPlan | null {
  const required = ['delivery', 'dock'];
  const replacement = pickReplacement(robots, plan.constraints.min_battery_pct, required);
  if (!replacement) return null;

  return {
    ...plan,
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
      ...plan.subtasks.slice(1),
    ],
    robot_selection: { ...plan.robot_selection, include: [replacement.id] },
  };
}

function applyReplan(
  mission_id: string,
  oldPlan: MissionPlan,
  newPlan: MissionPlan,
  reason: 'LOW_BATTERY' | 'BLOCKED',
  now: number
) {
  const s = useAppStore.getState();
  s.setMissionPlan(mission_id, newPlan);

  // KPI updates
  const recoveryMs = 5000; // placeholder until we track exact start/end of fault
  s.bumpKPI({
    replans_count: s.kpi.replans_count + 1,
    interventions_avoided: s.kpi.interventions_avoided + 1,
    mttr_ms_avg:
      s.kpi.mttr_ms_avg === 0
        ? recoveryMs
        : Math.round((s.kpi.mttr_ms_avg + recoveryMs) / 2),
  });

  // Event log + toast
  const oldRobotId = oldPlan.robot_selection.include[0];
  const newRobotId = newPlan.robot_selection.include[0];
  
  s.pushEvent({
    ts: now,
    level: 'INFO',
    msg: `Auto-replan: ${reason} → ${oldRobotId} → ${newRobotId}`,
    payload: { reason, mission_id, from_robot: oldRobotId, to_robot: newRobotId, before: oldPlan, after: newPlan },
  });

  toast.success(`Mission auto-replanned: ${reason} → ${newRobotId}`);

  // Clear stuck state for old robot
  if (oldRobotId) {
    stuckMap.delete(oldRobotId);
  }
}