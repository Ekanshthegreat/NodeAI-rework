import { describe, it, expect, vi, afterEach } from 'vitest';
import { BridgeClient, type SocketPort, BridgeMessage } from './client';
class Socket implements SocketPort {
  readyState = 1;
  onopen = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];
  closed = false;
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  message(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
}
const hello = { version: 1, type: 'hello', robots: ['agv1'] };
function setup() {
  const socket = new Socket(),
    receive = vi.fn(),
    connection = vi.fn(),
    warning = vi.fn();
  const client = new BridgeClient(receive, connection, warning, () => socket);
  return { client, socket, receive, connection, warning };
}
afterEach(() => vi.useRealTimers());
describe('ROS bridge client', () => {
  it('requires a versioned handshake before dispatch and validates targets', async () => {
    const { client, socket, receive } = setup();
    const connected = client.connect('ws://127.0.0.1:8765');
    expect(() => client.navigate('agv1', { x: 1, y: 2, yaw: 0 }, 'one')).toThrow('not connected');
    socket.message(hello);
    await connected;
    expect(receive).toHaveBeenCalledWith(hello);
    client.navigate('agv1', { x: 1, y: 2, yaw: 0 }, 'one');
    expect(JSON.parse(socket.sent[0]).type).toBe('navigate');
    expect(() => client.navigate('agv1', { x: NaN, y: 2, yaw: 0 }, 'bad')).toThrow();
    client.disconnect();
  });
  it('sends explicit cancellation without resubmitting after disconnect', async () => {
    const { client, socket } = setup();
    const p = client.connect('ws://localhost:8765');
    socket.message(hello);
    await p;
    client.cancel('agv1', 'one', 'cancel');
    expect(JSON.parse(socket.sent[0]).target_request_id).toBe('one');
    socket.onclose?.();
    expect(socket.sent).toHaveLength(1);
    expect(socket.closed).toBe(true);
  });
  it('rejects remote endpoints and credentials', async () => {
    const { client } = setup();
    await expect(client.connect('ws://example.com')).rejects.toThrow('loopback');
    await expect(client.connect('ws://user:password@localhost')).rejects.toThrow('loopback');
  });
  it('times out and closes a socket without a valid handshake', async () => {
    vi.useFakeTimers();
    const { client, socket } = setup();
    const p = client.connect('ws://localhost:8765');
    const rejected = expect(p).rejects.toThrow('ended');
    await vi.advanceTimersByTimeAsync(10000);
    await rejected;
    expect(socket.closed).toBe(true);
  });
  it('ignores malformed telemetry and preserves navigation state', async () => {
    const { client, socket, receive, warning } = setup();
    const p = client.connect('ws://localhost:8765');
    socket.message(hello);
    await p;
    socket.message({
      version: 1,
      type: 'navigation',
      request_id: 'one',
      robot_id: 'agv1',
      state: 'success',
    });
    expect(warning).toHaveBeenCalled();
    expect(receive).toHaveBeenCalledTimes(1);
    socket.message({
      version: 1,
      type: 'navigation',
      request_id: 'one',
      robot_id: 'agv1',
      state: 'accepted',
      error: null,
    });
    expect(receive.mock.lastCall?.[0].state).toBe('accepted');
    client.disconnect();
  });
  it('rejects non-finite or out-of-range sensor values', () => {
    expect(
      BridgeMessage.safeParse({
        version: 1,
        type: 'robots',
        robots: [
          {
            id: 'agv1',
            frame_id: 'map',
            pose: null,
            pose_age_seconds: 0,
            battery: 2,
            ready: true,
            request_id: null,
            state: 'idle',
          },
        ],
      }).success
    ).toBe(false);
  });
});
