import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePolicyStore } from '../store/usePolicyStore';
import { maybeReplan, trackRobotStuck, getRobotStuckDuration } from '../lib/policy';
import { toast } from 'react-hot-toast';

export const usePolicyEngine = () => {
  const { robots, missions, addEvent } = useAppStore();
  const {
    selfHealingEnabled,
    getMissionPlan,
    setMissionPlan,
    incrementReplanCount,
    getFault,
    clearExpiredFaults,
  } = usePolicyStore();

  const lastCheckRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!selfHealingEnabled) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Clear expired faults
      clearExpiredFaults();

      // Check each robot for policy violations
      robots.forEach((robot) => {
        const fault = getFault(robot.id);
        const activeMissions = missions.filter(
          (m) => m.status === 'active' || m.status === 'planning'
        );

        // Track stuck state
        trackRobotStuck(robot.id, robot.status === 'BLOCKED' || fault?.type === 'BLOCKED', now);

        activeMissions.forEach(async (mission) => {
          const plan = getMissionPlan(mission.id);
          if (!plan) return;

          // Check if this robot is assigned to this mission
          const isAssigned = plan.robot_selection.include.includes(robot.id);
          if (!isAssigned) return;

          let shouldReplan = false;
          let reason: 'BLOCKED' | 'LOW_BATTERY' | null = null;

          // Check for low battery
          if (robot.battery < plan.constraints.min_battery_pct || fault?.type === 'LOW_BATTERY') {
            shouldReplan = true;
            reason = 'LOW_BATTERY';
          }

          // Check for blocked robot
          const stuckDuration = getRobotStuckDuration(robot.id, now);
          const blockedThreshold = plan.subtasks[0]?.policy.reassign_on_blocked_s || 10;

          if (stuckDuration >= blockedThreshold || fault?.type === 'BLOCKED') {
            shouldReplan = true;
            reason = 'BLOCKED';
          }

          if (shouldReplan && reason) {
            try {
              const newPlan = await maybeReplan(reason, mission.id, {
                robots,
                getMissionPlan,
                setMissionPlan,
                now: () => now,
              });

              if (newPlan) {
                incrementReplanCount(mission.id);

                const newRobotId = newPlan.robot_selection.include[0];

                addEvent({
                  id: `event-${Date.now()}`,
                  mission_id: mission.id,
                  robot_id: newRobotId,
                  type: 'replan_event',
                  payload: {
                    reason,
                    from_robot: robot.id,
                    to_robot: newRobotId,
                    old_plan: plan,
                    new_plan: newPlan,
                  },
                  ts: new Date().toISOString(),
                });

                toast.success(
                  `Mission ${mission.id.slice(0, 8)} replanned: ${reason} → ${newRobotId}`
                );
              }
            } catch (error) {
              console.error('Replan failed:', error);
              toast.error(`Failed to replan mission ${mission.id.slice(0, 8)}`);
            }
          }
        });
      });

      lastCheckRef.current = now;
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [
    selfHealingEnabled,
    robots,
    missions,
    getMissionPlan,
    setMissionPlan,
    incrementReplanCount,
    getFault,
    clearExpiredFaults,
    addEvent,
  ]);

  return {
    selfHealingEnabled,
  };
};
