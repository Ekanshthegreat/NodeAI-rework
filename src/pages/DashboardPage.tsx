import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { Play, Pause, Square, Plus, AlertTriangle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFleetStore } from '../store/useFleetStore';
import FleetMap from '../components/FleetMap';
const Canvas3D = lazy(() =>
  import('../components/Canvas3D/Canvas3D').then((m) => ({ default: m.Canvas3D }))
);
const example = 'Deliver supplies from Pharmacy to Ward A';
const message = (error: unknown) => (error instanceof Error ? error.message : 'Operation failed');
export default function DashboardPage() {
  const store = useFleetStore(),
    { fleet } = store;
  const [command, setCommand] = useState(example),
    [selected, setSelected] = useState<string | null>(null),
    [view, setView] = useState<'2d' | '3d'>('2d'),
    [error, setError] = useState(''),
    [resetOpen, setResetOpen] = useState(false);
  const submit = (text: string) => {
    try {
      store.submit(text);
      setError('');
      toast.success('Mission dispatched');
    } catch (err) {
      setError(message(err));
    }
  };
  const active = fleet.missions.filter((m) => m.status === 'active' || m.status === 'paused');
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{fleet.site.name}</p>
          <h1>Mission control</h1>
          <p>Plan, execute and inspect the fleet’s behavior.</p>
        </div>
        <button className="quiet-button" onClick={() => setResetOpen(true)}>
          <RotateCcw size={15} /> Reset demo
        </button>
      </div>
      <div className="metrics">
        <div>
          <span>Robots available</span>
          <strong>
            {
              fleet.robots.filter(
                (r) => r.status === 'IDLE' && r.battery >= 0.2 && !fleet.faults[r.id]
              ).length
            }{' '}
            / {fleet.robots.length}
          </strong>
        </div>
        <div>
          <span>Open missions</span>
          <strong>{active.length}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{fleet.missions.filter((m) => m.status === 'completed').length}</strong>
        </div>
        <div>
          <span>Reassignments</span>
          <strong>{fleet.missions.reduce((count, m) => count + m.retries, 0)}</strong>
        </div>
        <div>
          <span>Simulation time</span>
          <strong>{(fleet.elapsedMs / 1000).toFixed(1)}s</strong>
        </div>
      </div>
      <div className="control-grid">
        <section className="panel map-panel">
          <div className="panel-heading">
            <h2>Live fleet</h2>
            <div className="segmented" role="group" aria-label="Map view">
              <button aria-pressed={view === '2d'} onClick={() => setView('2d')}>
                2D
              </button>
              <button aria-pressed={view === '3d'} onClick={() => setView('3d')}>
                3D
              </button>
            </div>
          </div>
          {view === '2d' ? (
            <FleetMap
              site={fleet.site}
              robots={fleet.robots}
              missions={fleet.missions}
              selectedRobot={selected}
              onSelect={setSelected}
            />
          ) : (
            <div className="three-view">
              <Suspense fallback={<p className="empty-state">Loading 3D view…</p>}>
                <Canvas3D />
              </Suspense>
            </div>
          )}
          <p className="map-caption">
            Routes avoid the map’s obstacles and no-go area. Robot-to-robot collision avoidance is
            outside this MVP.
          </p>
        </section>
        <section className="panel dispatch-panel">
          <h2>Dispatch a mission</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(command);
            }}
          >
            <label htmlFor="mission-command">Command</label>
            <textarea
              id="mission-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              maxLength={300}
              rows={3}
            />
            <p className="field-help">
              Commands use a small, explicit grammar. Location names must match the map.
            </p>
            <button type="submit" className="primary-button">
              <Plus size={16} /> Dispatch mission
            </button>
          </form>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <div className="examples">
            <span>Try an example</span>
            {[example, 'Inspect Ward B', 'Go to Loading Dock then Charge'].map((t) => (
              <button key={t} onClick={() => setCommand(t)}>
                {t}
              </button>
            ))}
          </div>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={fleet.selfHealing}
              onChange={(e) => store.setSelfHealing(e.target.checked)}
            />{' '}
            Automatic fault recovery
          </label>
          <p className="field-help">
            Blocked threshold: 3 simulated seconds. One reassignment per mission; unavailable
            replacements produce a visible failure.
          </p>
        </section>
      </div>
      <div className="lower-grid">
        <section className="panel">
          <h2>Robots</h2>
          <p className="field-help">
            Clear fault simulates an operator returning the robot to service; low-battery recovery
            includes a replacement battery.
          </p>
          <div className="robot-list">
            {fleet.robots.map((r) => (
              <article className="robot-card" key={r.id}>
                <div className="robot-title">
                  <strong>{r.id}</strong>
                  <span className="status">{r.status}</span>
                </div>
                <p>
                  Battery {Math.round(r.battery * 100)}% · Position {r.pose.x.toFixed(1)},{' '}
                  {r.pose.y.toFixed(1)}
                </p>
                <div className="robot-actions">
                  <button
                    className="quiet-button"
                    onClick={() => store.fault(r.id, 'BLOCKED')}
                    disabled={Boolean(fleet.faults[r.id])}
                  >
                    <AlertTriangle size={14} /> Block
                  </button>
                  <button
                    className="quiet-button"
                    onClick={() => store.fault(r.id, 'LOW_BATTERY')}
                    disabled={Boolean(fleet.faults[r.id])}
                  >
                    Low battery
                  </button>
                  {(fleet.faults[r.id] || r.status === 'ERROR' || r.battery < 0.2) && (
                    <button className="quiet-button" onClick={() => store.clearFault(r.id)}>
                      Clear fault
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Missions</h2>
            <Link to="/app/replay" className="text-link">
              Replay runs ↗
            </Link>
          </div>
          {fleet.missions.length === 0 ? (
            <p className="empty-state">Dispatch your first mission to start a recorded run.</p>
          ) : (
            <div className="mission-list">
              {fleet.missions
                .slice()
                .reverse()
                .map((m) => (
                  <article key={m.id} className="mission-card">
                    <div className="robot-title">
                      <strong>
                        {m.id} · {m.robotId}
                      </strong>
                      <span className="status">{m.status}</span>
                    </div>
                    <p>{m.nl}</p>
                    <p className="field-help">
                      {m.status === 'completed'
                        ? 'All steps complete'
                        : `Step ${Math.min(m.step + 1, m.plan.subtasks.length)} of ${m.plan.subtasks.length}: ${m.plan.subtasks[m.step]?.verb ?? 'finished'}`}{' '}
                      · {m.retries} reassignments{m.hasCargo ? ' · carrying simulated cargo' : ''}
                    </p>
                    {m.error && <p className="inline-error">{m.error}</p>}
                    {['active', 'paused'].includes(m.status) && (
                      <div className="robot-actions">
                        <button
                          className="quiet-button"
                          onClick={() => store.pauseMission(m.id, m.status === 'active')}
                        >
                          {m.status === 'active' ? <Pause size={14} /> : <Play size={14} />}{' '}
                          {m.status === 'active' ? 'Pause mission' : 'Resume mission'}
                        </button>
                        <button className="quiet-button" onClick={() => store.cancel(m.id)}>
                          <Square size={13} /> Cancel mission
                        </button>
                      </div>
                    )}
                  </article>
                ))}
            </div>
          )}
        </section>
      </div>
      <section className="panel event-panel">
        <h2>Event log</h2>
        <p className="field-help">Mission and recovery events, ordered by simulation time.</p>
        {fleet.events.length === 0 ? (
          <p className="empty-state">No events yet.</p>
        ) : (
          <ol>
            {fleet.events
              .slice(-30)
              .reverse()
              .map((e) => (
                <li key={e.sequence}>
                  <time>{(e.at / 1000).toFixed(1)}s</time>
                  <span>{e.message}</span>
                </li>
              ))}
          </ol>
        )}
      </section>
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} className="dialog-backdrop">
        <Dialog.Panel className="confirm-dialog">
          <Dialog.Title as="h2">Reset local demo?</Dialog.Title>
          <p>This replaces the fleet and deletes the runs saved in this browser.</p>
          <div className="robot-actions">
            <button className="secondary-button" onClick={() => setResetOpen(false)}>
              Keep runs
            </button>
            <button
              className="primary-button"
              onClick={() => {
                store.reset();
                setError('');
                setResetOpen(false);
              }}
            >
              Reset fleet and runs
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}
