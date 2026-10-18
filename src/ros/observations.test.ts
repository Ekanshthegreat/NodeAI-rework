import { describe, expect, it } from 'vitest';
import { createJournal, exportJournal, observeEvent } from './journal';
import { parseObservations, filterObservations, OBSERVATION_FILE_LIMIT } from './observations';

function example() {
  let journal = observeEvent(
    createJournal(0),
    {
      version: 1,
      type: 'navigation',
      request_id: 'route',
      robot_id: 'agv1',
      state: 'running',
      error: null,
    },
    'test_fixture',
    1000,
    1
  );
  journal = observeEvent(
    journal,
    { version: 1, type: 'error', request_id: 'route', message: 'Rejected request' },
    'test_fixture',
    900,
    1
  );
  journal = observeEvent(
    journal,
    {
      version: 1,
      type: 'navigation',
      request_id: 'route',
      robot_id: 'agv2',
      state: 'succeeded',
      error: null,
    },
    'ros',
    2000,
    2
  );
  return JSON.parse(exportJournal(journal, 3000));
}
describe('offline ROS observations', () => {
  it('round-trips exports and preserves sequence order when the browser clock moves backward', () => {
    const record = parseObservations(JSON.stringify(example()));
    expect(record.events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(record.events[1].received_at).toBe('1970-01-01T00:00:00.900Z');
  });
  it('filters by session before combining reused request IDs and retains request errors', () => {
    const record = parseObservations(JSON.stringify(example()));
    expect(filterObservations(record, '1', '', 'route')).toHaveLength(2);
    expect(filterObservations(record, '', 'agv2', 'route')).toHaveLength(1);
    expect(filterObservations(record, '1', 'agv2', '')).toHaveLength(0);
    expect(filterObservations(record, '', '', '')).toHaveLength(3);
  });
  it('rejects malformed files, unsupported versions, unexpected message types and invalid timestamps', () => {
    expect(() => parseObservations('{')).toThrow('version-1');
    for (const change of [
      (record: ReturnType<typeof example>) => {
        record.format_version = 2;
      },
      (record: ReturnType<typeof example>) => {
        record.events[0].message = { version: 1, type: 'hello', robots: [] };
      },
      (record: ReturnType<typeof example>) => {
        record.exported_at = 'yesterday';
      },
      (record: ReturnType<typeof example>) => {
        record.events[0].message.distance_remaining = -1;
      },
    ]) {
      const record = example();
      change(record);
      expect(() => parseObservations(JSON.stringify(record))).toThrow();
    }
  });
  it('rejects duplicate or future sequences, reversed sessions and changed source labels', () => {
    for (const change of [
      (record: ReturnType<typeof example>) => {
        record.events[1].sequence = 1;
      },
      (record: ReturnType<typeof example>) => {
        record.next_sequence = 3;
      },
      (record: ReturnType<typeof example>) => {
        record.events[0].bridge_session = 3;
      },
      (record: ReturnType<typeof example>) => {
        record.events[1].source = 'ros';
      },
      (record: ReturnType<typeof example>) => {
        record.dropped_events = 1;
      },
      (record: ReturnType<typeof example>) => {
        record.events[0].message.completed_waypoints = 3;
        record.events[0].message.total_waypoints = 2;
      },
    ]) {
      const record = example();
      change(record);
      expect(() => parseObservations(JSON.stringify(record))).toThrow('inconsistent');
    }
  });
  it('accepts empty records and sequence gaps from coalescing and retention', () => {
    expect(parseObservations(exportJournal(createJournal(0), 1)).events).toHaveLength(0);
    const record = example();
    record.events.splice(1, 1);
    record.dropped_events = 1;
    expect(parseObservations(JSON.stringify(record)).events).toHaveLength(2);
  });
  it('bounds UTF-8 file size and event count before displaying records', () => {
    expect(() => parseObservations(' '.repeat(OBSERVATION_FILE_LIMIT + 1))).toThrow('2 MiB');
    expect(() => parseObservations('界'.repeat(OBSERVATION_FILE_LIMIT / 2))).toThrow('2 MiB');
    const record = example();
    record.events = Array(501).fill(record.events[0]);
    expect(() => parseObservations(JSON.stringify(record))).toThrow('version-1');
  });
});
