import type { Adapter } from './types';
import { ExternalTelemetrySchema } from './types';
import type { TelemetryMessage, MissionPlan, EventMessage } from '../types';

class RMFAdapter implements Adapter {
  id = 'rmf';
  type = 'rmf' as const;

  private ws: WebSocket | null = null;
  private onTelemetry: ((msg: TelemetryMessage) => void) | null = null;
  private onEvent: ((e: EventMessage) => void) | null = null;
  private wsUrl: string;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private shouldReconnect = false;

  constructor() {
    this.wsUrl = import.meta.env.VITE_RMF_WS || 'ws://localhost:9777';
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
            msg: `[RMF] Connected to ${this.wsUrl}`,
            payload: { url: this.wsUrl },
          });

          this.startHeartbeat();
          resolve();
        };

        this.ws.onerror = (error) => {
          this.onEvent?.({
            ts: Date.now(),
            level: 'ERROR',
            msg: '[RMF] WebSocket error',
            payload: { error: error.toString() },
          });
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          this.onEvent?.({
            ts: Date.now(),
            level: 'WARN',
            msg: '[RMF] Connection closed',
            payload: {},
          });

          if (this.shouldReconnect) {
            this.reconnectTimeout = setTimeout(() => {
              this.onEvent?.({
                ts: Date.now(),
                level: 'INFO',
                msg: '[RMF] Attempting reconnect...',
                payload: {},
              });
              this.connect().catch(() => {});
            }, 5000);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'telemetry') {
              const parsed = ExternalTelemetrySchema.safeParse(data);

              if (parsed.success) {
                this.onTelemetry?.(parsed.data);
              } else {
                this.onEvent?.({
                  ts: Date.now(),
                  level: 'WARN',
                  msg: '[RMF] Invalid telemetry message',
                  payload: {
                    error: parsed.error.message,
                    data,
                  },
                });
              }
            } else {
              this.onEvent?.({
                ts: Date.now(),
                level: 'INFO',
                msg: `[RMF] Received message: ${data.type || 'unknown'}`,
                payload: data,
              });
            }
          } catch (error) {
            this.onEvent?.({
              ts: Date.now(),
              level: 'WARN',
              msg: '[RMF] Failed to parse message',
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
          msg: '[RMF] Connection failed',
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

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: '[RMF] Adapter disconnected',
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
      type: 'dispatch_mission',
      plan: mission,
    };

    this.ws.send(JSON.stringify(message));

    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: `[RMF] Mission dispatched: ${mission.natural_language}`,
      payload: { mission_id: mission.mission_id },
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() }));
      }
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const rmfAdapter = new RMFAdapter();
