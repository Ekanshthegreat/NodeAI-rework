import { describe, it, expect } from 'vitest';
import { createJournal, observeEvent, exportJournal, JOURNAL_LIMIT } from './journal';
import type { JournalEvent } from './journal';
const navigation = (
  state: 'pending' | 'running' | 'succeeded',
  completed = 0
): Extract<JournalEvent, { type: 'navigation' }> => ({
  version: 1,
  type: 'navigation',
  request_id: 'route',
  robot_id: 'agv1',
  state,
  error: null,
  completed_waypoints: completed,
  total_waypoints: 2,
});
describe('ROS observations', () => {
  it('retains transitions, coalesces only consecutive feedback and preserves waypoint changes', () => {
    let journal = createJournal(0);
    for (const event of [
      navigation('pending'),
      navigation('running'),
      navigation('running'),
      navigation('running', 1),
      navigation('succeeded', 2),
    ])
      journal = observeEvent(journal, event, 'test_fixture', 1000);
    expect(journal.events.map((e) => e.sequence)).toEqual([1, 3, 4, 5]);
    expect(journal.events.map((e) => e.message.type === 'navigation' && e.message.state)).toEqual([
      'pending',
      'running',
      'running',
      'succeeded',
    ]);
    expect(journal.dropped_events).toBe(0);
  });
  it('does not merge different requests, errors, sources or robots', () => {
    let journal = observeEvent(createJournal(0), navigation('running'), 'ros', 0);
    journal = observeEvent(journal, { ...navigation('running'), request_id: 'other' }, 'ros', 1);
    journal = observeEvent(
      journal,
      { version: 1, type: 'error', request_id: 'other', message: 'rejected' },
      'ros',
      2
    );
    journal = observeEvent(journal, navigation('running'), 'test_fixture', 3);
    journal = observeEvent(
      journal,
      { ...navigation('running'), robot_id: 'agv2' },
      'test_fixture',
      4
    );
    expect(journal.events).toHaveLength(5);
  });
  it('bounds retained history and reports lost events without reusing sequence numbers', () => {
    let journal = createJournal(0);
    for (let i = 0; i < JOURNAL_LIMIT + 2; i++)
      journal = observeEvent(journal, navigation('pending'), 'ros', i);
    expect(journal.events).toHaveLength(JOURNAL_LIMIT);
    expect(journal.dropped_events).toBe(2);
    expect(journal.events[0].sequence).toBe(3);
    expect(journal.next_sequence).toBe(JOURNAL_LIMIT + 3);
  });
  it('exports receipt times and fixture provenance without mutating the received message', () => {
    const message = navigation('pending');
    const journal = observeEvent(createJournal(0), message, 'test_fixture', 1000);
    message.request_id = 'changed';
    const exported = JSON.parse(exportJournal(journal, 2000));
    expect(exported.events[0].message.request_id).toBe('route');
    expect(exported.events[0].source).toBe('test_fixture');
    expect(exported.events[0].received_at).toBe('1970-01-01T00:00:01.000Z');
    expect(exported.exported_at).toBe('1970-01-01T00:00:02.000Z');
    expect(exported.scope).toContain('not a complete robot trajectory');
  });
});

it('keeps repeated request IDs separate across bridge connections', () => {
  let journal = observeEvent(createJournal(0), navigation('running'), 'ros', 0, 1);
  journal = observeEvent(journal, navigation('running'), 'ros', 1, 2);
  expect(journal.events.map((event) => event.bridge_session)).toEqual([1, 2]);
});
