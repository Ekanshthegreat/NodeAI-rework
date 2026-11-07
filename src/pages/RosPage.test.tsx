import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BridgeMessage } from '../ros/client';
import RosPage from './RosPage';

const bridge = vi.hoisted(() => ({
  receive: (_message: BridgeMessage) => {},
  connection: (_active: boolean) => {},
}));
vi.mock('../ros/client', async (original) => ({
  ...(await original<typeof import('../ros/client')>()),
  BridgeClient: class {
    constructor(receive: typeof bridge.receive, connection: typeof bridge.connection) {
      bridge.receive = receive;
      bridge.connection = connection;
    }
    disconnect() {}
  },
}));
const host = document.createElement('div');
let root: ReturnType<typeof createRoot>;
afterEach(() => {
  act(() => root?.unmount());
  host.replaceChildren();
});
function connect(capabilities?: Array<'navigate' | 'waypoints' | 'cancel'>, active = false) {
  act(() => {
    bridge.connection(true);
    bridge.receive({ version: 1, type: 'hello', robots: ['agv1'], capabilities });
    bridge.receive({
      version: 1,
      type: 'robots',
      robots: [
        {
          id: 'agv1',
          frame_id: 'map',
          pose: null,
          pose_age_seconds: null,
          battery: null,
          ready: true,
          request_id: active ? 'goal' : null,
          state: active ? 'running' : 'idle',
        },
      ],
    });
  });
}
function button(text: string) {
  return [...host.querySelectorAll('button')].find((value) => value.textContent === text)!;
}
function mount() {
  root = createRoot(host);
  act(() =>
    root.render(
      <MemoryRouter>
        <RosPage />
      </MemoryRouter>
    )
  );
}
describe('ROS command availability', () => {
  it('selects waypoint dispatch when single-pose navigation is unavailable', () => {
    mount();
    connect(['waypoints']);
    expect(host.querySelector<HTMLSelectElement>('#ros-mission-type')!.value).toBe('waypoints');
    expect(host.querySelector<HTMLOptionElement>('option[value="navigate"]')!.disabled).toBe(true);
    expect(button('Send waypoint mission').disabled).toBe(false);
  });
  it('disables dispatch and cancellation for a read-only bridge', () => {
    mount();
    connect([], true);
    expect(button('Send Nav2 goal').disabled).toBe(true);
    expect(button('Cancel Nav2 goal').disabled).toBe(true);
  });
  it('keeps legacy navigation and clears capabilities after disconnect', () => {
    mount();
    connect();
    expect(button('Send Nav2 goal').disabled).toBe(false);
    expect(host.querySelector<HTMLOptionElement>('option[value="waypoints"]')!.disabled).toBe(true);
    act(() => bridge.connection(false));
    expect(button('Send Nav2 goal').disabled).toBe(true);
  });
});
