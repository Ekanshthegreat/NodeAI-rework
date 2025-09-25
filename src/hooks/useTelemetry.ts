import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePolicyStore } from '../store/usePolicyStore';
import { useSceneStore } from '../store/useSceneStore';
import type { Robot, TelemetryPoint } from '../types';

interface TelemetryConfig {
  updateInterval: number;
  movementSpeed: number;
  batteryDrainRate: number;
  enableFaultInjection: boolean;
}

const DEFAULT_CONFIG: TelemetryConfig = {
  updateInterval: 100, // ms
  movementSpeed: 0.5, // m/s
  batteryDrainRate: 0.001, // per update
  enableFaultInjection: true,
};

export const useTelemetry = (config: Partial<TelemetryConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  
  const {
    robots,
    setRobots,
    addTelemetry,
    addEvent,
    telemetryEnabled,
    faultInjected,
    selectedMission,
  } = useAppStore();
  
  const { evaluatePolicy } = usePolicyStore();
  const { missionPaths } = useSceneStore();

  // Simulate robot movement along mission path
  const simulateMovement = (robot: Robot, deltaTime: number): Robot => {
    if (!selectedMission || robot.status !== 'ACTIVE') {
      return robot;
    }

    const missionPath = missionPaths[selectedMission.id];
    if (!missionPath || missionPath.length === 0) {
      return robot;
    }

    // Simple path following simulation
    const currentPos = robot.pose;
    const targetIndex = Math.min(
      Math.floor((Date.now() - (selectedMission.created_at?.getTime() || 0)) / 5000),
      missionPath.length - 1
    );
    
    if (targetIndex < missionPath.length) {
      const target = missionPath[targetIndex];
      const dx = target.x - currentPos.x;
      const dy = target.y - currentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0.1) {
        const moveDistance = finalConfig.movementSpeed * (deltaTime / 1000);
        const ratio = Math.min(moveDistance / distance, 1);
        
        return {
          ...robot,
          pose: {
            x: currentPos.x + dx * ratio,
            y: currentPos.y + dy * ratio,
            theta: Math.atan2(dy, dx),
          },
        };
      }
    }

    return robot;
  };

  // Simulate battery drain
  const simulateBattery = (robot: Robot): Robot => {
    if (robot.status === 'ACTIVE') {
      const newBattery = Math.max(0, robot.battery - finalConfig.batteryDrainRate);
      
      // Battery critical event
      if (newBattery < 0.2 && robot.battery >= 0.2) {
        addEvent({
          ts: Date.now(),
          level: 'WARN',
          msg: `Battery critical for robot ${robot.id}`,
          payload: { robot_id: robot.id, battery: newBattery },
        });
      }
      
      return { ...robot, battery: newBattery };
    }
    
    return robot;
  };

  // Apply fault injection
  const applyFaultInjection = (robot: Robot): Robot => {
    if (!finalConfig.enableFaultInjection || !faultInjected) {
      return robot;
    }

    // Random fault scenarios
    const faultChance = Math.random();
    
    if (faultChance < 0.001) { // 0.1% chance per update
      const faults = ['FAULT', 'ERROR', 'MAINTENANCE'];
      const randomFault = faults[Math.floor(Math.random() * faults.length)];
      
      addEvent({
        ts: Date.now(),
        level: 'ERROR',
        msg: `Fault injected: ${randomFault} for robot ${robot.id}`,
        payload: { robot_id: robot.id, fault_type: randomFault },
      });
      
      return { ...robot, status: randomFault };
    }
    
    return robot;
  };

  // Main telemetry update loop
  const updateTelemetry = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    if (!telemetryEnabled || robots.length === 0) {
      return;
    }

    const updatedRobots = robots.map(robot => {
      let updatedRobot = robot;
      
      // Apply simulations
      updatedRobot = simulateMovement(updatedRobot, deltaTime);
      updatedRobot = simulateBattery(updatedRobot);
      updatedRobot = applyFaultInjection(updatedRobot);
      
      // Update timestamp
      updatedRobot = {
        ...updatedRobot,
        updated_at: new Date(),
      };

      // Add telemetry point
      const telemetryPoint: TelemetryPoint = {
        timestamp: now,
        robot_id: robot.id,
        position: updatedRobot.pose,
        battery: updatedRobot.battery,
        status: updatedRobot.status,
        velocity: {
          x: (updatedRobot.pose.x - robot.pose.x) / (deltaTime / 1000),
          y: (updatedRobot.pose.y - robot.pose.y) / (deltaTime / 1000),
        },
      };
      
      addTelemetry(telemetryPoint);

      // Evaluate policies
      try {
        evaluatePolicy(updatedRobot, telemetryPoint);
      } catch (error) {
        addEvent({
          ts: now,
          level: 'ERROR',
          msg: `Policy evaluation error for robot ${robot.id}`,
          payload: { error: (error as Error).message, robot_id: robot.id },
        });
      }

      return updatedRobot;
    });

    setRobots(updatedRobots);
  };

  // Start/stop telemetry
  useEffect(() => {
    if (telemetryEnabled) {
      addEvent({
        ts: Date.now(),
        level: 'INFO',
        msg: 'Telemetry system started',
        payload: { config: finalConfig },
      });

      intervalRef.current = setInterval(updateTelemetry, finalConfig.updateInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        addEvent({
          ts: Date.now(),
          level: 'INFO',
          msg: 'Telemetry system stopped',
          payload: {},
        });
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [telemetryEnabled, finalConfig.updateInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isRunning: telemetryEnabled && intervalRef.current !== null,
    config: finalConfig,
  };
};