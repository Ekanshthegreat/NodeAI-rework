import { z } from 'zod';
import { BridgeMessage } from './client';
import { JOURNAL_LIMIT, type JournalEvent } from './journal';

export const OBSERVATION_FILE_LIMIT = 2 * 1024 * 1024;
const counter = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.string().datetime({ offset: true });
const recordSchema = z.object({
  format_version: z.literal(1),
  kind: z.literal('nodeai_ros_observations'),
  exported_at: timestamp,
  started_at: timestamp,
  scope: z.string().max(2048),
  next_sequence: counter.min(1),
  dropped_events: counter,
  events: z
    .array(
      z.object({
        sequence: counter.min(1),
        received_at: timestamp,
        source: z.enum(['ros', 'test_fixture']),
        bridge_session: counter.min(1),
        message: BridgeMessage.refine(
          (message): message is JournalEvent =>
            message.type === 'navigation' || message.type === 'error'
        ),
      })
    )
    .max(JOURNAL_LIMIT),
});
export type ObservationRecord = z.infer<typeof recordSchema>;

export function parseObservations(text: string): ObservationRecord {
  if (
    text.length > OBSERVATION_FILE_LIMIT ||
    new TextEncoder().encode(text).byteLength > OBSERVATION_FILE_LIMIT
  )
    throw new Error('Observation files must be no larger than 2 MiB.');
  let record: ObservationRecord;
  try {
    record = recordSchema.parse(JSON.parse(text));
  } catch {
    throw new Error('Choose a version-1 NodeAI ROS observation JSON export.');
  }
  let sequence = 0,
    session = 0;
  const sources = new Map<number, string>();
  for (const event of record.events) {
    if (
      event.sequence <= sequence ||
      event.sequence >= record.next_sequence ||
      event.bridge_session < session ||
      (sources.has(event.bridge_session) && sources.get(event.bridge_session) !== event.source)
    )
      throw new Error('Observation sequences or bridge-session labels are inconsistent.');
    const message = event.message;
    if (
      message.type === 'navigation' &&
      message.total_waypoints !== undefined &&
      (message.completed_waypoints ?? 0) > message.total_waypoints
    )
      throw new Error('Observation waypoint progress is inconsistent.');
    sequence = event.sequence;
    session = event.bridge_session;
    sources.set(session, event.source);
  }
  if (record.dropped_events > record.next_sequence - 1 - record.events.length)
    throw new Error('Observation retention counts are inconsistent.');
  return record;
}

export function filterObservations(
  record: ObservationRecord,
  session: string,
  robot: string,
  request: string
) {
  return record.events.filter(
    (event) =>
      (!session || String(event.bridge_session) === session) &&
      (!robot || (event.message.type === 'navigation' && event.message.robot_id === robot)) &&
      (!request || event.message.request_id === request)
  );
}
