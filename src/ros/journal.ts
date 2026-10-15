import type { BridgeMessage } from './client';

export const JOURNAL_LIMIT = 500;
export type JournalEvent = Extract<BridgeMessage, { type: 'navigation' | 'error' }>;
export interface ObservedEvent {
  sequence: number;
  received_at: string;
  source: 'ros' | 'test_fixture';
  bridge_session: number;
  message: JournalEvent;
}
export interface RosJournal {
  started_at: string;
  next_sequence: number;
  dropped_events: number;
  events: ObservedEvent[];
}
export function createJournal(now = Date.now()): RosJournal {
  return {
    started_at: new Date(now).toISOString(),
    next_sequence: 1,
    dropped_events: 0,
    events: [],
  };
}
// Consecutive feedback updates replace one another, but lifecycle transitions remain.
export function observeEvent(
  journal: RosJournal,
  message: JournalEvent,
  source: ObservedEvent['source'],
  now = Date.now(),
  bridgeSession = 1
): RosJournal {
  const previous = journal.events[journal.events.length - 1];
  const feedback =
    message.type === 'navigation' &&
    message.state === 'running' &&
    previous?.message.type === 'navigation' &&
    previous.message.state === 'running' &&
    previous.message.request_id === message.request_id &&
    previous.message.robot_id === message.robot_id &&
    previous.message.completed_waypoints === message.completed_waypoints &&
    previous.message.total_waypoints === message.total_waypoints &&
    previous.message.error === message.error &&
    previous.bridge_session === bridgeSession &&
    previous.source === source;
  const event: ObservedEvent = {
    sequence: journal.next_sequence,
    received_at: new Date(now).toISOString(),
    source,
    bridge_session: bridgeSession,
    message: structuredClone(message),
  };
  const events = [...(feedback ? journal.events.slice(0, -1) : journal.events), event];
  const overflow = Math.max(0, events.length - JOURNAL_LIMIT);
  return {
    ...journal,
    next_sequence: journal.next_sequence + 1,
    dropped_events: journal.dropped_events + overflow,
    events: events.slice(-JOURNAL_LIMIT),
  };
}
export function exportJournal(journal: RosJournal, now = Date.now()): string {
  return JSON.stringify(
    {
      format_version: 1,
      kind: 'nodeai_ros_observations',
      exported_at: new Date(now).toISOString(),
      scope:
        'Browser-observed navigation events only. Receipt times are browser UTC, not ROS timestamps. Feedback is coalesced; this is not a complete robot trajectory or an authoritative action journal.',
      ...journal,
    },
    null,
    2
  );
}
