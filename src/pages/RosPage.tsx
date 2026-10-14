import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BridgeClient, type BridgeMessage, type RosRobot } from '../ros/client';
export default function RosPage() {
  const [address, setAddress] = useState('ws://127.0.0.1:8765');
  const [connected, setConnected] = useState(false),
    [connecting, setConnecting] = useState(false),
    [error, setError] = useState('');
  const [robots, setRobots] = useState<RosRobot[]>([]),
    [selected, setSelected] = useState(''),
    [events, setEvents] = useState<BridgeMessage[]>([]);
  const [target, setTarget] = useState({ x: '1', y: '2', yaw: '0' }),
    [pending, setPending] = useState<Record<string, string>>({});
  const [lastHeartbeat, setLastHeartbeat] = useState(0),
    [now, setNow] = useState(Date.now());
  const [missionType, setMissionType] = useState<'navigate' | 'waypoints'>('navigate');
  const [waypoints, setWaypoints] = useState([
    { x: '1', y: '2', yaw: '0' },
    { x: '3', y: '4', yaw: '0' },
  ]);
  const [waypointSupport, setWaypointSupport] = useState(false);
  const [mode, setMode] = useState<'ros' | 'test_fixture'>('ros');
  const client = useRef<BridgeClient | null>(null);
  useEffect(() => {
    client.current = new BridgeClient(
      (message) => {
        if (message.type === 'hello') {
          setMode(message.mode ?? 'ros');
          setWaypointSupport(message.capabilities?.includes('waypoints') ?? false);
        }
        if (message.type === 'robots') {
          setRobots(message.robots);
          setLastHeartbeat(Date.now());
          setSelected((current) =>
            message.robots.some((r) => r.id === current) ? current : (message.robots[0]?.id ?? '')
          );
        }
        if (message.type === 'navigation' || message.type === 'error') {
          setEvents((current) =>
            [
              message,
              ...current.filter(
                (event) =>
                  !(
                    message.type === 'navigation' &&
                    event.type === 'navigation' &&
                    event.state === message.state &&
                    event.error === message.error &&
                    event.completed_waypoints === message.completed_waypoints &&
                    event.request_id === message.request_id
                  )
              ),
            ].slice(0, 30)
          );
          if (message.type === 'error') setError(message.message);
          if (
            message.type === 'error' ||
            ['succeeded', 'cancelled', 'rejected', 'failed'].includes(message.state)
          )
            setPending((current) =>
              Object.fromEntries(
                Object.entries(current).filter(([, request]) => request !== message.request_id)
              )
            );
        }
      },
      (active) => {
        setConnected(active);
        if (!active) {
          setRobots([]);
          setPending({});
        }
      },
      setError
    );
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => {
      clearInterval(timer);
      client.current?.disconnect();
    };
  }, []);
  const robot = robots.find((r) => r.id === selected),
    fresh = connected && now - lastHeartbeat < 3000;
  const activeRequest = robot?.request_id ?? pending[selected];
  const connect = async () => {
    setConnecting(true);
    setError('');
    try {
      await client.current?.connect(address);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  };
  const send = () => {
    setError('');
    try {
      const id = crypto.randomUUID();
      if (missionType === 'waypoints')
        client.current?.waypoints(
          selected,
          waypoints.map((point) => ({
            x: Number(point.x),
            y: Number(point.y),
            yaw: Number(point.yaw),
          })),
          id
        );
      else
        client.current?.navigate(
          selected,
          { x: Number(target.x), y: Number(target.y), yaw: Number(target.yaw) },
          id
        );
      setPending((current) => ({ ...current, [selected]: id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="dashboard">
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            {mode === 'test_fixture' ? 'ROS 2 action test fixture' : 'ROS 2 / Nav2'}
          </p>
          <h1>ROS mission control</h1>
          <p>Live localization, battery state and navigation action results.</p>
        </div>
        <Link to="/app" className="text-link">
          Local simulation ↗
        </Link>
      </header>
      <section className="panel">
        <h2>Bridge connection</h2>
        <div className="ros-connection">
          <label htmlFor="ros-address">Loopback endpoint</label>
          <input
            id="ros-address"
            value={address}
            disabled={connected || connecting}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            className="primary-button"
            disabled={connecting}
            onClick={() => (connected ? client.current?.disconnect() : void connect())}
          >
            {connected ? 'Disconnect' : connecting ? 'Connecting…' : 'Connect to ROS'}
          </button>
        </div>
        <p role="status">
          {connected
            ? fresh
              ? 'Connected · telemetry current'
              : 'Connected · waiting for current telemetry'
            : 'Disconnected'}
        </p>
        <p className="field-help">
          Start the nodeai_bridge ROS package on the ROS host. Remote hosts can be reached through a
          loopback SSH tunnel. Disconnecting the browser leaves outstanding Nav2 goals running.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <div className="lower-grid">
        <section className="panel">
          <h2>ROS robots</h2>
          {robots.length === 0 ? (
            <p className="empty-state">Connect to the bridge to discover configured robots.</p>
          ) : (
            robots.map((r) => (
              <article className="robot-card" key={r.id}>
                <div className="robot-title">
                  <strong>{r.id}</strong>
                  <span className="status">{fresh ? r.state : 'stale'}</span>
                </div>
                <p>
                  Frame {r.frame_id} · Battery{' '}
                  {r.battery === null ? 'unknown' : `${Math.round(r.battery * 100)}%`}
                </p>
                <p>
                  {r.pose
                    ? `Pose ${r.pose.x.toFixed(2)}, ${r.pose.y.toFixed(2)} · yaw ${r.pose.yaw.toFixed(2)}`
                    : 'Waiting for localization'}
                </p>
                <p className="field-help">
                  {r.ready
                    ? 'Nav2 ready'
                    : 'Waiting for Nav2, fresh localization or adequate battery'}{' '}
                  · Pose age{' '}
                  {r.pose_age_seconds === null ? 'unknown' : `${r.pose_age_seconds.toFixed(1)}s`}
                </p>
                {r.request_id && (
                  <p className="field-help">
                    Waypoints completed {r.completed_waypoints ?? 0} / {r.total_waypoints ?? 1}
                  </p>
                )}
              </article>
            ))
          )}
        </section>
        <section className="panel">
          <h2>ROS navigation mission</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="ros-target"
          >
            <label htmlFor="ros-robot">Robot</label>
            <select id="ros-robot" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="" disabled>
                Select a robot
              </option>
              {robots.map((r) => (
                <option key={r.id}>{r.id}</option>
              ))}
            </select>
            <label htmlFor="ros-mission-type">Mission type</label>
            <select
              id="ros-mission-type"
              value={missionType}
              onChange={(event) => setMissionType(event.target.value as 'navigate' | 'waypoints')}
            >
              <option value="navigate">Single pose</option>
              <option value="waypoints" disabled={!waypointSupport}>
                Waypoint route
              </option>
            </select>
            {missionType === 'waypoints' ? (
              <div className="waypoint-editor">
                {waypoints.map((point, index) => (
                  <fieldset key={index}>
                    <legend>Waypoint {index + 1}</legend>
                    {(['x', 'y', 'yaw'] as const).map((key) => (
                      <label key={key}>
                        {key === 'yaw' ? 'Yaw (radians)' : `${key.toUpperCase()} (metres)`}
                        <input
                          type="number"
                          step="any"
                          required
                          value={point[key]}
                          onChange={(event) =>
                            setWaypoints((current) =>
                              current.map((value, i) =>
                                i === index ? { ...value, [key]: event.target.value } : value
                              )
                            )
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      className="quiet-button"
                      disabled={waypoints.length === 1}
                      onClick={() =>
                        setWaypoints((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      Remove waypoint {index + 1}
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className="secondary-button"
                  disabled={waypoints.length >= 20}
                  onClick={() =>
                    setWaypoints((current) => [...current, { x: '0', y: '0', yaw: '0' }])
                  }
                >
                  Add waypoint
                </button>
              </div>
            ) : (
              (['x', 'y', 'yaw'] as const).map((key) => (
                <label key={key}>
                  {key === 'yaw' ? 'Yaw (radians)' : `${key.toUpperCase()} (metres)`}
                  <input
                    type="number"
                    step="any"
                    required
                    value={target[key]}
                    onChange={(e) => setTarget((t) => ({ ...t, [key]: e.target.value }))}
                  />
                </label>
              ))
            )}
            <p className="field-help">
              Target coordinates use the robot’s configured ROS frame. Nav2 owns route planning and
              obstacle avoidance.
            </p>
            <button
              className="primary-button"
              type="submit"
              disabled={!fresh || !robot?.ready || Boolean(activeRequest)}
            >
              {missionType === 'waypoints' ? 'Send waypoint mission' : 'Send Nav2 goal'}
            </button>
          </form>
          {activeRequest && (
            <div className="robot-actions">
              <p className="field-help">Goal {activeRequest}</p>
              <button
                className="secondary-button"
                disabled={!connected}
                onClick={() => {
                  try {
                    client.current?.cancel(selected, activeRequest, crypto.randomUUID());
                  } catch (e) {
                    setError(String(e));
                  }
                }}
              >
                Cancel Nav2 goal
              </button>
            </div>
          )}
        </section>
      </div>
      <section className="panel event-panel">
        <h2>Navigation events</h2>
        <p className="field-help">
          Acceptance means Nav2 received the goal; success appears only after the action result.
          Unknown outcomes keep the robot occupied.
        </p>
        {events.length === 0 ? (
          <p className="empty-state">No navigation events in this browser session.</p>
        ) : (
          <ol>
            {events.map((e, i) => (
              <li key={i}>
                <span>
                  {e.type === 'navigation'
                    ? `${e.robot_id} · ${e.state} · ${e.completed_waypoints ?? 0}/${e.total_waypoints ?? 1} waypoints · ${e.request_id}${e.error ? ` · ${e.error}` : ''}`
                    : e.type === 'error'
                      ? e.message
                      : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
