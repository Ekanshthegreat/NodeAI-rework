import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { replayFrame, recordingDuration } from '../simulation/replay';
import FleetMap from '../components/FleetMap';
export default function ReplayPage() {
  const fleet = useFleetStore((s) => s.fleet);
  const available = fleet.missions
    .filter(
      (m) => ['completed', 'failed', 'cancelled'].includes(m.status) && fleet.recordings[m.id]
    )
    .slice()
    .reverse();
  const [chosen, setChosen] = useState(''),
    [offset, setOffset] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const selected = available.find((m) => m.id === chosen) ?? available[0];
  const record = selected ? fleet.recordings[selected.id] : null;
  const duration = record ? recordingDuration(record) : 0;
  const frame = record ? replayFrame(record, offset) : null;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setOffset((t) => Math.min(duration, t + 100 * speed)),
      100
    );
    return () => window.clearInterval(timer);
  }, [playing, speed, duration]);
  useEffect(() => {
    if (playing && offset >= duration) setPlaying(false);
  }, [offset, duration, playing]);
  const exportRun = () => {
    if (!record || !selected) return;
    const data = { version: 1, mission: selected, site: fleet.site, recording: record };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `nodeai-${selected.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="replay-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Recorded simulation</p>
          <h1>Mission replay</h1>
          <p>Inspect captured positions and events without changing the live fleet.</p>
        </div>
        <Link className="secondary-button" to="/app">
          Back to mission control
        </Link>
      </div>
      {!record || !frame ? (
        <section className="panel">
          <h2>No completed runs yet</h2>
          <p className="empty-state">
            Dispatch a mission, let it finish or cancel it, then return here. The latest ten
            recordings are retained in this browser.
          </p>
          <Link className="primary-button" to="/app">
            Run a mission
          </Link>
        </section>
      ) : (
        <>
          <section className="panel replay-controls">
            <label htmlFor="recorded-mission">Recorded mission</label>
            <select
              id="recorded-mission"
              value={selected.id}
              onChange={(e) => {
                setChosen(e.target.value);
                setOffset(0);
                setPlaying(false);
              }}
            >
              {available.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.status} · {m.nl}
                </option>
              ))}
            </select>
            <div className="playback-buttons">
              <button
                className="secondary-button"
                onClick={() => {
                  setOffset(0);
                  setPlaying(false);
                }}
              >
                <SkipBack size={16} /> Start
              </button>
              <button
                className="primary-button"
                disabled={!duration}
                onClick={() => {
                  if (offset >= duration) setOffset(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
                {playing ? 'Pause replay' : 'Play replay'}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setOffset(duration);
                  setPlaying(false);
                }}
              >
                <SkipForward size={16} /> End
              </button>
              <label htmlFor="playback-speed">Speed</label>
              <select
                id="playback-speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[0.5, 1, 2, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}×
                  </option>
                ))}
              </select>
              <button className="quiet-button" onClick={exportRun}>
                <Download size={15} /> Export run JSON
              </button>
            </div>
            <label htmlFor="replay-seek" className="seek-label">
              Replay position{' '}
              <span>
                {(offset / 1000).toFixed(1)} / {(duration / 1000).toFixed(1)}s
              </span>
            </label>
            <input
              id="replay-seek"
              aria-label="Replay position"
              type="range"
              min={0}
              max={duration || 1}
              step={100}
              value={offset}
              onChange={(e) => {
                setOffset(Number(e.target.value));
                setPlaying(false);
              }}
            />
            <p className="field-help">
              Snapshots are captured every 500 simulation milliseconds and at lifecycle transitions.
              The timeline shows recorded states, not a new execution.
            </p>
          </section>
          <div className="replay-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Recorded fleet</h2>
                <span className="status">
                  {frame.status} · {frame.robotId}
                </span>
              </div>
              <FleetMap site={fleet.site} robots={frame.robots} selectedRobot={frame.robotId} />
            </section>
            <section className="panel event-panel">
              <h2>Events at this position</h2>
              <p className="field-help">{selected.nl}</p>
              <ol>
                {record.events
                  .filter((e) => e.at <= frame.at)
                  .map((e) => (
                    <li key={e.sequence}>
                      <time>{((e.at - record.frames[0].at) / 1000).toFixed(1)}s</time>
                      <span>{e.message}</span>
                    </li>
                  ))}
              </ol>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
