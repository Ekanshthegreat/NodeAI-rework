import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSceneStore } from '../store/useSceneStore';

interface TelemetryOptions {
  enabled?: boolean;
  interval?: number;
}

export const useTelemetry = (options: TelemetryOptions = {}) => {
  const { enabled = true, interval = 1000 } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { robots, updateRobot, pushEvent } = useAppStore();
  const { selectedRobotId } = useSceneStore();

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start telemetry simulation
    intervalRef.current = setInterval(() => {
      robots.forEach(robot => {
        // Simple random walk movement
        const deltaX = (Math.random() - 0.5) * 0.2;
        const deltaY = (Math.random() - 0.5) * 0.2;
        const deltaTheta = (Math.random() - 0.5) * 0.1;

        // Slowly drain battery
        const batteryDrain = Math.random() * 0.001;

        const updatedRobot = {
          ...robot,
          pose: {
            x: robot.pose.x + deltaX,
            y: robot.pose.y + deltaY,
            theta: robot.pose.theta + deltaTheta
          },
          battery: Math.max(0, robot.battery - batteryDrain),
          updated_at: new Date().toISOString()
        };

        updateRobot(updatedRobot);

        // Log telemetry update for selected robot
        if (robot.id === selectedRobotId) {
          pushEvent({
            ts: Date.now(),
            level: 'DEBUG',
            msg: `[TELEMETRY] Robot ${robot.id} updated`,
            payload: {
              robot_id: robot.id,
              pose: updatedRobot.pose,
              battery: updatedRobot.battery
            }
          });
        }
      });
    }, interval);

    // Log telemetry start
    pushEvent({
      ts: Date.now(),
      level: 'INFO',
      msg: '[TELEMETRY] Simulation started',
      payload: { interval, robot_count: robots.length }
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, robots, updateRobot, pushEvent, selectedRobotId]);

  return {
    isRunning: enabled && intervalRef.current !== null
  };
};