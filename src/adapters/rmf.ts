import type { Adapter } from './types';
import type { TelemetryMessage, MissionPlan, EventMessage } from '../types';

class RMFAdapter implements Adapter {
  id = 'rmf';
  type = 'rmf' as const;

  private _onTelemetry: ((msg: TelemetryMessage) => void) | null = null;
  private onEvent: ((e: EventMessage) => void) | null = null;

  async connect(): Promise<void> {
    this.onEvent?.({
      ts: Date.now(),
      level: 'WARN',
      msg: '[RMF] Adapter not yet implemented',
      payload: {}
    });
  }

  disconnect(): void {
    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: '[RMF] Adapter disconnected',
      payload: {}
    });
  }

  subscribe(
    onTelemetry: (msg: TelemetryMessage) => void,
    onEvent: (e: EventMessage) => void
  ): void {
    this._onTelemetry = onTelemetry;
    this.onEvent = onEvent;
  }

  async sendMission(mission: MissionPlan): Promise<void> {
    this.onEvent?.({
      ts: Date.now(),
      level: 'WARN',
      msg: '[RMF] Mission publishing not yet implemented',
      payload: { mission_id: mission.mission_id }
    });
  }
}

export const rmfAdapter = new RMFAdapter();
