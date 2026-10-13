import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { z } from 'zod';
import type { Adapter } from './types';
import type { TelemetryMessage, MissionPlan, EventMessage } from '../types';

const VDAStateSchema = z.object({
  agvPosition: z.object({
    x: z.number(),
    y: z.number(),
    theta: z.number().optional()
  }).optional(),
  batteryState: z.object({
    batteryCharge: z.number(),
    charging: z.boolean().optional()
  }).optional(),
  operatingMode: z.enum(['AUTOMATIC', 'SEMIAUTOMATIC', 'MANUAL', 'SERVICE', 'TEACHIN']).optional(),
  driving: z.boolean().optional(),
  paused: z.boolean().optional(),
  errors: z.array(z.any()).optional()
});

class VDA5050Adapter implements Adapter {
  id = 'vda5050';
  type = 'vda5050' as const;

  private client: MqttClient | null = null;
  private onTelemetry: ((msg: TelemetryMessage) => void) | null = null;
  private onEvent: ((e: EventMessage) => void) | null = null;
  private mqttUrl: string;
  private topicBase: string;
  private reconnectTimeout: NodeJS.Timeout | null = null;


  constructor() {
    this.mqttUrl = import.meta.env.VITE_VDA_MQTT_URL || 'ws://localhost:9001';
    this.topicBase = import.meta.env.VITE_VDA_TOPIC_BASE || 'vda5050/AGV-001';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {

        this.client = mqtt.connect(this.mqttUrl, {
          reconnectPeriod: 5000,
          clean: true
        });

        this.client.on('connect', () => {
          const stateTopic = `${this.topicBase}/state`;

          this.client?.subscribe(stateTopic, (err) => {
            if (err) {
              this.onEvent?.({
                ts: Date.now(),
                level: 'ERROR',
                msg: `[VDA-5050] Failed to subscribe to ${stateTopic}`,
                payload: { error: err.message }
              });
              reject(err);
            } else {
              this.onEvent?.({
                ts: Date.now(),
                level: 'INFO',
                msg: `[VDA-5050] Connected to ${this.mqttUrl}, subscribed to ${stateTopic}`,
                payload: { url: this.mqttUrl, topic: stateTopic }
              });
              resolve();
            }
          });
        });

        this.client.on('error', (error) => {
          this.onEvent?.({
            ts: Date.now(),
            level: 'ERROR',
            msg: '[VDA-5050] MQTT error',
            payload: { error: error.message }
          });
        });

        this.client.on('close', () => {
          this.onEvent?.({
            ts: Date.now(),
            level: 'WARN',
            msg: '[VDA-5050] Connection closed',
            payload: {}
          });
        });

        this.client.on('message', (topic, message) => {
          try {
            const data = JSON.parse(message.toString());

            if (topic.endsWith('/state')) {
              const parsed = VDAStateSchema.safeParse(data);

              if (parsed.success) {
                const vdaState = parsed.data;

                const status = vdaState.errors && vdaState.errors.length > 0 ? 'ERROR' :
                              vdaState.paused ? 'BLOCKED' :
                              vdaState.driving ? 'ACTIVE' :
                              vdaState.batteryState?.charging ? 'CHARGING' :
                              'IDLE';

                const telemetry: TelemetryMessage = {
                  type: 'telemetry',
                  ts: Date.now(),
                  robot_id: this.topicBase.split('/').pop() || 'AGV-001',
                  vendor: 'vda5050',
                  pose: {
                    x: vdaState.agvPosition?.x || 0,
                    y: vdaState.agvPosition?.y || 0,
                    theta: vdaState.agvPosition?.theta || 0
                  },
                  vel: vdaState.driving ? 1.0 : 0,
                  battery: vdaState.batteryState?.batteryCharge || 1.0,
                  status,
                  task_id: null
                };

                this.onTelemetry?.(telemetry);
              } else {
                this.onEvent?.({
                  ts: Date.now(),
                  level: 'WARN',
                  msg: '[VDA-5050] Invalid state message',
                  payload: {
                    error: parsed.error.message,
                    data
                  }
                });
              }
            } else {
              this.onEvent?.({
                ts: Date.now(),
                level: 'INFO',
                msg: `[VDA-5050] Received message on ${topic}`,
                payload: data
              });
            }
          } catch (error) {
            this.onEvent?.({
              ts: Date.now(),
              level: 'WARN',
              msg: '[VDA-5050] Failed to parse message',
              payload: {
                error: error instanceof Error ? error.message : String(error),
                topic
              }
            });
          }
        });

        setTimeout(() => {
          if (!this.client?.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.onEvent?.({
          ts: Date.now(),
          level: 'ERROR',
          msg: '[VDA-5050] Connection failed',
          payload: { error: error instanceof Error ? error.message : String(error) }
        });
        reject(error);
      }
    });
  }

  disconnect(): void {


    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client) {
      this.client.end();
      this.client = null;
    }

    this.onEvent?.({
      ts: Date.now(),
      level: 'INFO',
      msg: '[VDA-5050] Adapter disconnected',
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
    if (!this.client?.connected) {
      throw new Error('MQTT not connected');
    }

    const navigateTask = mission.subtasks.find(t => t.verb === 'navigate');

    const order = {
      headerId: 0,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      manufacturer: 'NodeAI',
      serialNumber: this.topicBase.split('/').pop() || 'AGV-001',
      orderId: mission.mission_id,
      orderUpdateId: 0,
      nodes: navigateTask ? [
        {
          nodeId: 'start',
          sequenceId: 0,
          released: true,
          nodePosition: { x: 0, y: 0, mapId: mission.site_id }
        },
        {
          nodeId: 'target',
          sequenceId: 1,
          released: true,
          nodePosition: { x: 10, y: 10, mapId: mission.site_id }
        }
      ] : [],
      edges: navigateTask ? [
        {
          edgeId: 'e1',
          sequenceId: 0,
          startNodeId: 'start',
          endNodeId: 'target',
          released: true
        }
      ] : []
    };

    const orderTopic = `${this.topicBase}/order`;

    return new Promise((resolve, reject) => {
      this.client?.publish(orderTopic, JSON.stringify(order), (err) => {
        if (err) {
          this.onEvent?.({
            ts: Date.now(),
            level: 'ERROR',
            msg: `[VDA-5050] Failed to publish order`,
            payload: { error: err.message, mission_id: mission.mission_id }
          });
          reject(err);
        } else {
          this.onEvent?.({
            ts: Date.now(),
            level: 'INFO',
            msg: `[VDA-5050] Order published: ${mission.natural_language}`,
            payload: { mission_id: mission.mission_id, order_id: order.orderId }
          });
          resolve();
        }
      });
    });
  }
}

export const vdaAdapter = new VDA5050Adapter();
