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
const heartbeat = {
  version: 1,
  type: 'robots',
  robots: [
    {
      id: 'agv1',
      frame_id: 'map',
      pose: null,
      pose_age_seconds: null,
      battery: null,
      ready: false,
      request_id: null,
      state: 'idle',
    },
  ],
};
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
  it('closes a handshaken connection that never supplies robot telemetry', async () => {
    vi.useFakeTimers();
    const { client, socket, connection, warning } = setup();
    const connected = client.connect('ws://localhost:8765');
    socket.message(hello);
    await connected;
    client.navigate('agv1', { x: 1, y: 2, yaw: 0 }, 'one');
    await vi.advanceTimersByTimeAsync(10000);
    expect(socket.closed).toBe(true);
    expect(connection).toHaveBeenLastCalledWith(false);
    expect(warning).toHaveBeenLastCalledWith(expect.stringContaining('telemetry timed out'));
    expect(socket.sent).toHaveLength(1); // no automatic cancel or replay
    expect(() => client.cancel('agv1', 'one', 'cancel')).toThrow('not connected');
  });
  it('extends the telemetry deadline only after a valid robot snapshot', async () => {
    vi.useFakeTimers();
    const { client, socket } = setup();
    const connected = client.connect('ws://localhost:8765');
    socket.message(hello);
    await connected;
    await vi.advanceTimersByTimeAsync(9000);
    socket.message(heartbeat);
    await vi.advanceTimersByTimeAsync(9000);
    expect(socket.closed).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(socket.closed).toBe(true);
  });
  it('does not let navigation, malformed telemetry or foreign robots mask a heartbeat failure', async () => {
    vi.useFakeTimers();
    const { client, socket } = setup();
    const connected = client.connect('ws://localhost:8765');
    socket.message(hello);
    await connected;
    await vi.advanceTimersByTimeAsync(9000);
    socket.message({
      version: 1,
      type: 'navigation',
      robot_id: 'agv1',
      request_id: 'one',
      state: 'running',
      error: null,
    });
    socket.message({ ...heartbeat, robots: [{ ...heartbeat.robots[0], battery: 2 }] });
    socket.message({ ...heartbeat, robots: [{ ...heartbeat.robots[0], id: 'foreign' }] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(socket.closed).toBe(true);
  });
  it('clears old watchdogs on reconnect and explicit disconnect', async () => {
    vi.useFakeTimers();
    const first = new Socket(),
      second = new Socket();
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const warning = vi.fn();
    const client = new BridgeClient(vi.fn(), vi.fn(), warning, factory);
    let connected = client.connect('ws://localhost:8765');
    first.message(hello);
    await connected;
    await vi.advanceTimersByTimeAsync(9000);
    connected = client.connect('ws://localhost:8766');
    second.message(hello);
    await connected;
    await vi.advanceTimersByTimeAsync(1000);
    expect(second.closed).toBe(false);
    expect(warning).not.toHaveBeenCalled();
    client.disconnect();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(20000);
    expect(warning).not.toHaveBeenCalled();
  });
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
  it('requires advertised waypoint support and validates the entire route', async () => {
    const { client, socket } = setup();
    let connection = client.connect('ws://localhost:8765');
    socket.message(hello);
    await connection;
    expect(() => client.waypoints('agv1', [{ x: 1, y: 2, yaw: 0 }], 'route')).toThrow(
      'does not support'
    );
    client.disconnect();
    connection = client.connect('ws://localhost:8765');
    socket.message({ ...hello, capabilities: ['navigate', 'waypoints', 'cancel'] });
    await connection;
    expect(() =>
      client.waypoints(
        'agv1',
        [
          { x: 1, y: 2, yaw: 0 },
          { x: NaN, y: 2, yaw: 0 },
        ],
        'bad'
      )
    ).toThrow();
    expect(socket.sent).toHaveLength(0);
    client.waypoints(
      'agv1',
      [
        { x: 1, y: 2, yaw: 0 },
        { x: 3, y: 4, yaw: 0 },
      ],
      'route'
    );
    expect(JSON.parse(socket.sent[0]).targets).toHaveLength(2);
    client.disconnect();
  });
  it('rejects a second handshake before its mode can relabel observations', async () => {
    const { client, socket, receive, warning } = setup();
    const connected = client.connect('ws://localhost:8765');
    socket.message({ ...hello, mode: 'test_fixture' });
    await connected;
    socket.message({ ...hello, mode: 'ros' });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('second handshake'));
    expect(receive).toHaveBeenCalledTimes(1);
    expect(socket.closed).toBe(true);
    expect(() => client.navigate('agv1', { x: 0, y: 0, yaw: 0 }, 'one')).toThrow('not connected');
  });
  it('rejects duplicate handshake robot IDs and closes an oversized message', async () => {
    const { client, socket, warning } = setup();
    const connected = client.connect('ws://localhost:8765');
    const rejected = expect(connected).rejects.toThrow('ended');
    socket.message({ ...hello, robots: ['agv1', 'agv1'] });
    await rejected;
    expect(socket.closed).toBe(true);
    const retry = client.connect('ws://localhost:8765');
    const timeout = expect(retry).rejects.toThrow('ended');
    socket.onmessage?.({ data: ' '.repeat(65537) });
    await timeout;
    expect(warning).toHaveBeenLastCalledWith(expect.stringContaining('64 KiB'));
  });
  it('ignores foreign and duplicate snapshots without losing a valid session', async () => {
    const { client, socket, receive } = setup();
    const connected = client.connect('ws://localhost:8765');
    socket.message(hello);
    await connected;
    const robot = {
      id: 'agv1',
      frame_id: 'map',
      pose: null,
      pose_age_seconds: null,
      battery: null,
      ready: false,
      request_id: null,
      state: 'idle',
    };
    socket.message({ version: 1, type: 'robots', robots: [robot, robot] });
    socket.message({ version: 1, type: 'robots', robots: [{ ...robot, id: 'foreign' }] });
    socket.message({
      version: 1,
      type: 'navigation',
      robot_id: 'foreign',
      request_id: 'one',
      state: 'running',
      error: null,
    });
    expect(receive).toHaveBeenCalledTimes(1);
    socket.message({ version: 1, type: 'robots', robots: [robot] });
    expect(receive).toHaveBeenCalledTimes(2);
    expect(() => client.cancel('foreign', 'one', 'cancel')).toThrow('not advertised');
    client.navigate('agv1', { x: 0, y: 0, yaw: 0 }, 'one');
    expect(socket.sent).toHaveLength(1);
    client.disconnect();
  });
  it('does not accept callbacks or robot identities from a replaced connection', async () => {
    const first = new Socket(),
      second = new Socket(),
      receive = vi.fn();
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const client = new BridgeClient(receive, vi.fn(), vi.fn(), factory);
    const connected = client.connect('ws://localhost:8765');
    first.message(hello);
    await connected;
    const staleCallback = first.onmessage;
    const next = client.connect('ws://localhost:8766');
    staleCallback?.({ data: JSON.stringify(hello) });
    expect(receive).toHaveBeenCalledTimes(1);
    second.message({ ...hello, robots: ['agv2'] });
    await next;
    expect(() => client.navigate('agv1', { x: 0, y: 0, yaw: 0 }, 'one')).toThrow('not advertised');
    client.navigate('agv2', { x: 0, y: 0, yaw: 0 }, 'two');
    expect(second.sent).toHaveLength(1);
    client.disconnect();
  });
  it('returns a rejected promise for malformed URLs without disturbing a connection', async () => {
    const { client, socket } = setup();
    const connected = client.connect('ws://localhost:8765');
    socket.message(hello);
    await connected;
    await expect(client.connect('not a url')).rejects.toThrow('valid loopback');
    expect(socket.closed).toBe(false);
    client.navigate('agv1', { x: 0, y: 0, yaw: 0 }, 'one');
    client.disconnect();
  });
  it('measures the message limit in UTF-8 bytes, not JavaScript characters', async () => {
    const { client, socket, receive, warning } = setup();
    const connected = client.connect('ws://localhost:8765');
    socket.message(hello);
    await connected;
    const data = JSON.stringify({
      version: 1,
      type: 'error',
      request_id: null,
      message: '界'.repeat(22000),
    });
    expect(data.length).toBeLessThan(65536);
    socket.onmessage?.({ data });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('64 KiB'));
    expect(socket.closed).toBe(true);
    expect(receive).toHaveBeenCalledTimes(1);
    client.disconnect();
  });
});
