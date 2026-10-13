import type { Adapter } from './types';
import { ExternalTelemetrySchema } from './types';
import type { TelemetryMessage, MissionPlan, EventMessage } from '../types';

class ROSAdapter implements Adapter {
  id = 'ros';
  type = 'ros' as const;

  private ws: WebSocket | null = null;
  private onTelemetry: ((msg: TelemetryMessage) => void) | null = null;
  private onEvent: ((e: EventMessage) => void) | null = null;
  private wsUrl: string;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private shouldReconnect = false;

  constructor() {
    this.wsUrl = import.meta.env.VITE_TELEMETRY_WS || 'ws://localhost:8765';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.shouldReconnect = true;
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.onEvent?.({
            ts: Date.now(),
            level: 'INFO',
            msg: `[ROS] Connected to ${this.wsUrl}`,
            payload: { url: this.wsUrl },
          });
          resolve();
        };

        this.ws.onerror = (error) => {
          this.onEvent?.({
            ts: Date.now(),
            level: 'ERROR',
            msg: '[ROS] WebSocket error',
            payload: { error: error.toString() },
          });
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          this.onEvent?.({
            ts: Date.now(),
            level: 'WARN',
            msg: '[ROS] Connection closed',
            payload: {},
          });

          if (this.shouldReconnect) {
            this.reconnectTimeout = setTimeout(() => {
              this.onEvent?.({
                ts: Date.now(),
                level: 'INFO',
                msg: '[ROS] Attempting reconnect...',
                payload: {},
              });
              this.connect().catch(() => {});
            }, 5000);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            const parsed = ExternalTelemetrySchema.safeParse(data);

            if (parsed.success) {
              this.onTelemetry?.(parsed.data);
            } else {
              this.onEvent?.({
                ts: Date.now(),
                level: 'WARN',
                msg: '[ROS] Invalid telemetry message',
                payload: {
                  error: parsed.error.message,
                  data,
                },
              });
            }
          } catch (error) {
            this.onEvent?.({
              ts: Date.now(),
              level: 'WARN',
              msg: '[ROS] Failed to parse message',
              payload: {
                error: error instanceof Error ? error.message : String(error),
                raw: event.data,
              },
            });
          }
        };

        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        this.onEvent?.({
          ts: Date.now(),
          level: 'ERROR',
          msg: '[ROS] Connection failed',
          payload: { error: error instanceof Error ? error.message : String(error) },
        });
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: '[ROS] Adapter disconnected',
      payload: {},
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'mission',
      plan: mission,
    };

    this.ws.send(JSON.stringify(message));

    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: `[ROS] Mission sent: ${mission.natural_language}`,
      payload: { mission_id: mission.mission_id },
    });
  }
}

export const rosAdapter = new ROSAdapter();
