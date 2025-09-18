import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TelemetrySchema } from '../types';

export const useTelemetry = () => {
  const ws = useRef<WebSocket | null>(null);
  const {
    telemetryEnabled,
    setRealtimeConnected,
    addTelemetry,
    robots,
    setRobots,
  } = useAppStore();

  useEffect(() => {
    if (!telemetryEnabled) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
        setRealtimeConnected(false);
      }
      return;
    }

    const wsUrl = import.meta.env.VITE_TELEMETRY_WS || 'ws://localhost:8080/ws';
    
    const connect = () => {
      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('Telemetry WebSocket connected');
          setRealtimeConnected(true);
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const result = TelemetrySchema.safeParse(data);
            
            if (result.success) {
              const telemetry = result.data;
              addTelemetry(telemetry);
              
              // Update robot state
              setRobots(robots.map(robot => 
                robot.id === telemetry.robot_id 
                  ? {
                      ...robot,
                      pose: telemetry.pose,
                      battery: telemetry.battery,
                      status: telemetry.status,
                      updated_at: new Date(telemetry.ts).toISOString(),
                    }
                  : robot
              ));
            }
          } catch (error) {
            console.error('Error parsing telemetry:', error);
          }
        };

        ws.current.onclose = () => {
          console.log('Telemetry WebSocket disconnected');
          setRealtimeConnected(false);
          
          // Attempt to reconnect after 5 seconds
          setTimeout(connect, 5000);
        };

        ws.current.onerror = (error) => {
          console.error('Telemetry WebSocket error:', error);
          setRealtimeConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect to telemetry WebSocket:', error);
        setRealtimeConnected(false);
        
        // Retry connection after 5 seconds
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [telemetryEnabled, setRealtimeConnected, addTelemetry, robots, setRobots]);

  // Mock telemetry generator for demo purposes
  useEffect(() => {
    if (!telemetryEnabled) return;

    const interval = setInterval(() => {
      // Generate mock telemetry for demo
      const mockTelemetry = {
        type: 'telemetry' as const,
        ts: Date.now(),
        robot_id: 'AGV-001',
        vendor: 'mock' as const,
        pose: {
          x: Math.sin(Date.now() / 5000) * 3,
          y: Math.cos(Date.now() / 7000) * 2,
          theta: (Date.now() / 3000) % (Math.PI * 2),
        },
        vel: Math.random() * 2,
        battery: 0.85 - (Math.sin(Date.now() / 10000) * 0.1),
        status: 'ACTIVE' as const,
        task_id: 'task-demo-001',
      };

      addTelemetry(mockTelemetry);
    }, 2000);

    return () => clearInterval(interval);
  }, [telemetryEnabled, addTelemetry]);

  return {
    isConnected: useAppStore((state) => state.isRealtimeConnected),
    telemetryEnabled: useAppStore((state) => state.telemetryEnabled),
  };
};