import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  filterObservations,
  OBSERVATION_FILE_LIMIT,
  parseObservations,
  type ObservationRecord,
} from '../ros/observations';
import example from '../ros/example-observations.json';

export default function RosRecordsPage() {
  const [record, setRecord] = useState<ObservationRecord | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState(''),
    [robot, setRobot] = useState(''),
    [request, setRequest] = useState('');
  const loadVersion = useRef(0);
  const reset = () => {
    loadVersion.current += 1;
    setRecord(null);
    setName('');
    setError('');
    setSession('');
    setRobot('');
    setRequest('');
  };
  const open = (text: string, filename: string) => {
    try {
      setRecord(parseObservations(text));
      setName(filename);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to read this record.');
    }
  };
  const sessions = [...new Set(record?.events.map((event) => String(event.bridge_session)) ?? [])];
  const robots = [
    ...new Set(
      record?.events.flatMap((event) =>
        event.message.type === 'navigation' ? [event.message.robot_id] : []
      ) ?? []
    ),
  ];
  const requests = [
    ...new Set(
      record?.events.flatMap((event) =>
        event.message.request_id ? [event.message.request_id] : []
      ) ?? []
    ),
  ];
  const events = record ? filterObservations(record, session, robot, request) : [];
  return (
    <div className="ros-records-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Offline inspection</p>
          <h1>ROS observation records</h1>
          <p>Read a saved browser observation record. No bridge connection or robot commands.</p>
        </div>
        <Link to="/app/ros" className="text-link">
          Back to ROS controls ↗
        </Link>
      </header>
      <section className="panel">
        <h2>Open a record</h2>
        <div className="observation-controls">
          <label>
            Observation JSON file
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                reset();
                const version = loadVersion.current;
                if (file.size > OBSERVATION_FILE_LIMIT) {
                  setError('Observation files must be no larger than 2 MiB.');
                  return;
                }
                try {
                  const text = await file.text();
                  if (version === loadVersion.current) open(text, file.name);
                } catch {
                  if (version === loadVersion.current) setError('Unable to read this file.');
                }
              }}
            />
          </label>
          <button
            className="secondary-button"
            onClick={() => {
              reset();
              open(JSON.stringify(example), 'Example fixture record');
            }}
          >
            Load example
          </button>
          <button className="quiet-button" disabled={!record && !error} onClick={reset}>
            Clear record
          </button>
        </div>
        <p className="field-help">
          The file stays in this page's memory. Nothing is uploaded or saved to browser storage.
          Maximum 2 MiB / 500 retained events.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {record && (
        <>
          <section className="panel">
            <h2>{name}</h2>
            <p>
              {record.events.length} retained observations · {record.dropped_events} discarded at
              the history limit · exported {record.exported_at}
            </p>
            <p className="field-help">
              Browser receipt times are not ROS timestamps. Sequence gaps can reflect coalesced
              feedback or discarded history. A session number belongs only to this file; it does not
              identify a persistent bridge.
            </p>
            <div className="observation-controls">
              <label htmlFor="record-session">
                Bridge session
                <select
                  id="record-session"
                  value={session}
                  onChange={(event) => setSession(event.target.value)}
                >
                  <option value="">All sessions</option>
                  {sessions.map((id) => (
                    <option key={id} value={id}>
                      {id} ·{' '}
                      {record.events.find((event) => String(event.bridge_session) === id)?.source}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="record-robot">
                Robot
                <select
                  id="record-robot"
                  value={robot}
                  onChange={(event) => setRobot(event.target.value)}
                >
                  <option value="">All robots and errors</option>
                  {robots.map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </label>
              <label htmlFor="record-request">
                Request
                <select
                  id="record-request"
                  value={request}
                  onChange={(event) => setRequest(event.target.value)}
                >
                  <option value="">All requests</option>
                  {requests.map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="field-help">
              Choose a session to separate reused request IDs. Robot filters hide protocol errors
              without robot IDs.
            </p>
          </section>
          <section className="panel">
            <h2>Recorded events</h2>
            <p role="status">
              Showing {events.length} of {record.events.length} observations
            </p>
            {events.length === 0 ? (
              <p className="empty-state">No observations match these filters.</p>
            ) : (
              <div className="fleet-table-wrap">
                <table className="fleet-table observation-table">
                  <thead>
                    <tr>
                      <th>Sequence / receipt UTC</th>
                      <th>Session / source</th>
                      <th>Robot / request</th>
                      <th>Observation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.sequence}>
                        <td>
                          #{event.sequence}
                          <br />
                          <time>{event.received_at}</time>
                        </td>
                        <td>
                          {event.bridge_session}
                          <br />
                          {event.source}
                        </td>
                        <td>
                          {event.message.type === 'navigation' ? event.message.robot_id : '—'}
                          <br />
                          {event.message.request_id ?? 'No request ID'}
                        </td>
                        <td>
                          {event.message.type === 'error' ? (
                            event.message.message
                          ) : (
                            <>
                              <strong>{event.message.state}</strong>
                              {event.message.total_waypoints !== undefined && (
                                <div>
                                  Waypoints {event.message.completed_waypoints ?? 0} /{' '}
                                  {event.message.total_waypoints}
                                </div>
                              )}
                              {event.message.distance_remaining != null && (
                                <div>{event.message.distance_remaining.toFixed(2)} m remaining</div>
                              )}
                              {event.message.error && <div>{event.message.error}</div>}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="field-help">
              This is a partial observation history, not a trajectory replay or an authoritative
              account of robot state.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
