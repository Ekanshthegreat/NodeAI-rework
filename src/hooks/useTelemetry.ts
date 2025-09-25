import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { markRobotProgress, evaluatePoliciesOnTick } from '../lib/policy';
import type { TelemetryMessage } from '../types';

const TELEM_PERIOD_MS = 2000; // 2 seconds

export const useTelemetry = () => {
  const cleanupRef = useRef<(() => void) | null>(null);
  const { 
    robots, 
    setRobots, 
    addTelemetry, 
    setRealtimeConnected, 
    telemetryEnabled,
    faultInjected,
    pushEvent 
  } = useAppStore();

  useEffect(() => {
    if (!telemetryEnabled) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setRealtimeConnected(false);
      return;
    }

    try {
      // Start telemetry (mock for now, RMF later)
      cleanupRef.current = startTelemetry('mock');
      setRealtimeConnected(true);
      
      // Log successful telemetry start
      pushEvent({
        ts: Date.now(),
        level: 'INFO',
        msg: '[DEMO] Telemetry system started',
        payload: { source: 'mock', enabled: true }
      });
    } catch (error) {
      console.error('Failed to start telemetry:', error);
      setRealtimeConnected(false);
      
      // Log telemetry error
      pushEvent({
        ts: Date.now(),
        level: 'ERROR',
        msg: `[DEMO] Telemetry startup failed: ${(error as Error).message}`,
        payload: { error, source: 'mock' }
      });
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setRealtimeConnected(false);
    };
  }, [telemetryEnabled, setRealtimeConnected, pushEvent]);

  const startTelemetry = (source: 'mock' | 'rmf' | 'vda5050'): (() => void) => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Update robot states and generate telemetry
      const updatedRobots = robots.map(robot => {
        const fault = faultInjected[robot.id];
        let { pose, battery, status } = robot;
        
        // Apply fault injection
        if (fault?.drained) {
          battery = Math.max(0, battery - 0.05); // Rapid drain
        }
        
        if (fault?.blockedUntil && now < fault.blockedUntil) {
          status = 'BLOCKED';
        }
        
        // Simulate robot movement and battery changes
        if (status === 'ACTIVE' && !fault?.blockedUntil) {
          // Simple movement simulation
          pose = {
            ...pose,
            x: pose.x + (Math.random() - 0.5) * 0.2,
            y: pose.y + (Math.random() - 0.5) * 0.2,
            theta: pose.theta + (Math.random() - 0.5) * 0.1,
          };
          
          // Active battery drain: 0.2% per second
          battery = Math.max(0, battery - (0.002 * TELEM_PERIOD_MS / 1000));
        } else if (status === 'CHARGING') {
          // Charging: 1% per second
          battery = Math.min(1, battery + (0.01 * TELEM_PERIOD_MS / 1000));
          
          // Stop charging when full
          if (battery >= 0.95) {
            status = 'IDLE';
          }
        }
        
        // Auto-charge when battery is very low
        if (battery <= 0.15 && status !== 'CHARGING') {
          status = 'CHARGING';
        }
        
        // Track robot progress for policy engine
        const progressing = status === 'ACTIVE' && !fault?.blockedUntil;
        markRobotProgress(robot.id, progressing, now);
        
        // Generate telemetry message
        const telemetry: TelemetryMessage = {
          type: 'telemetry',
          ts: now,
          robot_id: robot.id,
          vendor: robot.vendor as 'rmf' | 'vda5050' | 'mock',
          pose,
          vel: status === 'ACTIVE' ? 0.5 : 0,
          battery,
          status: status as 'IDLE' | 'ACTIVE' | 'ERROR' | 'CHARGING' | 'BLOCKED',
          task_id: status === 'ACTIVE' ? `task-${robot.id}` : null,
        };
        
        addTelemetry(telemetry);
        
        return {
          ...robot,
          pose,
          battery,
          status,
          updated_at: new Date().toISOString(),
        };
      });
      
      setRobots(updatedRobots);
      
      // Run policy evaluation
      evaluatePoliciesOnTick(now);
      
    }, TELEM_PERIOD_MS);

    return () => {
      clearInterval(interval);
      
      // Log telemetry stop
      const { pushEvent } = useAppStore.getState();
      pushEvent({
        ts: Date.now(),
        level: 'INFO',
        msg: '[DEMO] Telemetry system stopped',
        payload: { source }
      });
    };
  };

  return {
    telemetryEnabled,
  };
};