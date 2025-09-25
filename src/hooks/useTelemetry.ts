import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

interface UseTelemetryOptions {
  enabled?: boolean;
  interval?: number;
}

export const useTelemetry = (options: UseTelemetryOptions = {}) => {
  const { enabled = true, interval = 1000 } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { 
    robots, 
    setRobots, 
    addEvent, 
    addTelemetry, 
    updateKpi,
    telemetryEnabled 
  } = useAppStore();

  useEffect(() => {
    if (!enabled || !telemetryEnabled || robots.length === 0) {
      return;
    }

    addEvent({
      ts: Date.now(),
      level: 'INFO',
      msg: '[TELEMETRY] Starting telemetry simulation',
      payload: { robot_count: robots.length }
    });

    intervalRef.current = setInterval(() => {
      const updatedRobots = robots.map(robot => {
        // Simple random walk movement
        const deltaX = (Math.random() - 0.5) * 0.5;
        const deltaY = (Math.random() - 0.5) * 0.5;
        const deltaTheta = (Math.random() - 0.5) * 0.2;

        const newPose = {
          x: robot.pose.x + deltaX,
          y: robot.pose.y + deltaY,
          theta: robot.pose.theta + deltaTheta
        };

        // Slowly drain battery
        const newBattery = Math.max(0, robot.battery - 0.001);
        
        // Change status based on battery
        let newStatus = robot.status;
        if (newBattery < 0.2 && robot.status !== 'CHARGING') {
          newStatus = 'CHARGING';
        } else if (newBattery > 0.8 && robot.status === 'CHARGING') {
          newStatus = 'IDLE';
        }

        const updatedRobot = {
          ...robot,
          pose: newPose,
          battery: newBattery,
          status: newStatus,
          updated_at: new Date().toISOString()
        };

        // Add telemetry data
        addTelemetry({
          robot_id: robot.id,
          pose: newPose,
          battery: newBattery,
          status: newStatus,
          velocity: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
          timestamp: Date.now()
        });

        return updatedRobot;
      });

      setRobots(updatedRobots);

      // Update KPIs
      const activeRobots = updatedRobots.filter(r => r.status === 'ACTIVE').length;
      const batteryAverage = updatedRobots.reduce((sum, r) => sum + r.battery, 0) / updatedRobots.length;

      updateKpi({
        totalRobots: updatedRobots.length,
        activeRobots,
        batteryAverage
      });

    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, telemetryEnabled, robots, interval, setRobots, addEvent, addTelemetry, updateKpi]);

  return {
    isRunning: !!intervalRef.current,
    robotCount: robots.length
  };
};