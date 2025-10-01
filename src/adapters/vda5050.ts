import type { Adapter } from './types';
import type { TelemetryMessage, MissionPlan, EventMessage } from '../types';

class VDA5050Adapter implements Adapter {
  id = 'vda5050';
  type = 'vda5050' as const;

  private _onTelemetry: ((msg: TelemetryMessage) => void) | null = null;
  private onEvent: ((e: EventMessage) => void) | null = null;

  async connect(): Promise<void> {
    this.onEvent?.({
      ts: Date.now(),
      level: 'WARN',
      msg: '[VDA5050] Adapter not yet implemented',
      payload: {}
    });
  }

  disconnect(): void {
    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: '[VDA5050] Adapter disconnected',
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
      msg: '[VDA5050] Mission publishing not yet implemented',
      payload: { mission_id: mission.mission_id }
    });
  }
}

export const vdaAdapter = new VDA5050Adapter();
