import { z } from 'zod';
const finite = z.number().finite();
const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export const Target = z
  .object({
    x: finite.min(-10000).max(10000),
    y: finite.min(-10000).max(10000),
    yaw: finite.min(-Math.PI).max(Math.PI),
  })
  .strict();
const navigationState = z.enum([
  'pending',
  'accepted',
  'running',
  'cancelling',
  'unknown',
  'succeeded',
  'cancelled',
  'rejected',
  'failed',
]);
const robot = z.object({
  id,
  frame_id: z.string(),
  pose: Target.nullable(),
  pose_age_seconds: finite.nonnegative().nullable(),
  battery: finite.min(0).max(1).nullable(),
  ready: z.boolean(),
  request_id: id.nullable(),
  state: z.union([navigationState, z.literal('idle')]),
});
export const BridgeMessage = z.discriminatedUnion('type', [
  z.object({ version: z.literal(1), type: z.literal('hello'), robots: z.array(id).max(32) }),
  z.object({ version: z.literal(1), type: z.literal('robots'), robots: z.array(robot).max(32) }),
  z.object({
    version: z.literal(1),
    type: z.literal('navigation'),
    request_id: id,
    robot_id: id,
    state: navigationState,
    error: z.string().nullable(),
    distance_remaining: finite.nonnegative().nullable().optional(),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal('error'),
    request_id: id.nullable(),
    message: z.string(),
  }),
]);
export type BridgeMessage = z.infer<typeof BridgeMessage>;
export type RosRobot = z.infer<typeof robot>;
export interface SocketPort {
  readyState: number;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  send(data: string): void;
  close(): void;
}
export class BridgeClient {
  private socket: SocketPort | null = null;
  private rejectConnection: ((error: Error) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private handshake = false;
  constructor(
    private receive: (message: BridgeMessage) => void,
    private connection: (connected: boolean) => void,
    private warning: (message: string) => void,
    private factory: (url: string) => SocketPort = (url) => {
      const socket = new WebSocket(url);
      const port: SocketPort = {
        get readyState() {
          return socket.readyState;
        },
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        send: (data) => socket.send(data),
        close: () => socket.close(),
      };
      socket.onopen = () => port.onopen?.();
      socket.onclose = () => port.onclose?.();
      socket.onerror = () => port.onerror?.();
      socket.onmessage = (event) =>
        port.onmessage?.({ data: typeof event.data === 'string' ? event.data : '' });
      return port;
    }
  ) {}
  connect(address: string): Promise<void> {
    const url = new URL(address);
    if (
      !['ws:', 'wss:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username ||
      url.password
    )
      return Promise.reject(
        new Error('Use a loopback WebSocket URL, or forward a ROS host through a local tunnel.')
      );
    this.disconnect();
    return new Promise((resolve, reject) => {
      this.rejectConnection = reject;
      const socket = this.factory(url.href);
      this.socket = socket;
      const fail = (message: string) => {
        if (this.socket !== socket) return;
        this.warning(message);
        this.disconnect();
      };
      this.timer = setTimeout(() => fail('Bridge handshake timed out'), 10000);
      socket.onopen = () => {};
      socket.onerror = () => fail('Unable to connect to the ROS bridge');
      socket.onclose = () =>
        fail('ROS bridge disconnected. Goals are not automatically cancelled or resubmitted.');
      socket.onmessage = (event) => {
        if (this.socket !== socket) return;
        try {
          const message = BridgeMessage.parse(JSON.parse(event.data));
          if (message.type === 'hello') {
            this.handshake = true;
            this.rejectConnection = null;
            if (this.timer) clearTimeout(this.timer);
            this.timer = null;
            this.connection(true);
            resolve();
          }
          if (this.handshake) this.receive(message);
        } catch {
          this.warning('Ignored an invalid ROS bridge message');
        }
      };
    });
  }
  navigate(robotId: string, target: z.infer<typeof Target>, requestId: string): void {
    this.send({
      version: 1,
      type: 'navigate',
      request_id: id.parse(requestId),
      robot_id: id.parse(robotId),
      target: Target.parse(target),
    });
  }
  cancel(robotId: string, targetRequestId: string, requestId: string): void {
    this.send({
      version: 1,
      type: 'cancel',
      request_id: id.parse(requestId),
      robot_id: id.parse(robotId),
      target_request_id: id.parse(targetRequestId),
    });
  }
  private send(data: unknown): void {
    if (!this.handshake || this.socket?.readyState !== 1)
      throw new Error('ROS bridge is not connected');
    this.socket.send(JSON.stringify(data));
  }
  disconnect(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.rejectConnection?.(new Error('ROS bridge connection ended'));
    this.rejectConnection = null;
    const socket = this.socket;
    this.socket = null;
    this.handshake = false;
    if (socket) {
      socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;
      socket.close();
    }
    this.connection(false);
  }
}
