import type { Adapter } from './types';
import type { TelemetryMessage, MissionPlan, EventMessage } from '../types';

class MockAdapter implements Adapter {
  id = 'mock';
  type = 'mock' as const;

  private interval: NodeJS.Timeout | null = null;
  private onTelemetry: ((msg: TelemetryMessage) => void) | null = null;
  private onEvent: ((e: EventMessage) => void) | null = null;
  private robots: Map<string, TelemetryMessage> = new Map();

  async connect(): Promise<void> {
    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: '[MOCK] Adapter connected',
      payload: {}
    });
  }

  disconnect(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: '[MOCK] Adapter disconnected',
      payload: {}
    });
  }

  subscribe(
    onTelemetry: (msg: TelemetryMessage) => void,
    onEvent: (e: EventMessage) => void
  ): void {
    this.onTelemetry = onTelemetry;
    this.onEvent = onEvent;
  }

  async sendMission(mission: MissionPlan): Promise<void> {
    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: `[MOCK] Mission sent: ${mission.natural_language}`,
      payload: { mission_id: mission.mission_id }
    });
  }

  startSimulation(robotIds: string[]): void {
    robotIds.forEach(robotId => {
      this.robots.set(robotId, {
        type: 'telemetry',
        ts: Date.now(),
        robot_id: robotId,
        vendor: 'mock',
        pose: { x: Math.random() * 20 - 10, y: Math.random() * 20 - 10, theta: 0 },
        vel: 0,
        battery: 0.8 + Math.random() * 0.2,
        status: 'IDLE',
        task_id: null
      });
    });

    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      this.robots.forEach((robot, robotId) => {
        const deltaX = (Math.random() - 0.5) * 0.5;
        const deltaY = (Math.random() - 0.5) * 0.5;
        const deltaTheta = (Math.random() - 0.5) * 0.2;

        const updatedRobot: TelemetryMessage = {
          ...robot,
          ts: Date.now(),
          pose: {
            x: robot.pose.x + deltaX,
            y: robot.pose.y + deltaY,
            theta: robot.pose.theta + deltaTheta
          },
          vel: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
          battery: Math.max(0, robot.battery - 0.001)
        };

        if (updatedRobot.battery < 0.2 && robot.status !== 'CHARGING') {
          updatedRobot.status = 'CHARGING';
        } else if (updatedRobot.battery > 0.8 && robot.status === 'CHARGING') {
          updatedRobot.status = 'IDLE';
        }

        this.robots.set(robotId, updatedRobot);
        this.onTelemetry?.(updatedRobot);
      });
    }, 1000);
  }

  stopSimulation(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.robots.clear();
  }
}

export const mockAdapter = new MockAdapter();
