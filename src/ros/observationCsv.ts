import type { ObservedEvent } from './journal';

const columns = [
  'sequence',
  'received_at_utc',
  'bridge_session',
  'source',
  'type',
  'robot_id',
  'request_id',
  'state',
  'completed_waypoints',
  'total_waypoints',
  'distance_remaining_metres',
  'error',
];

function cell(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value);
  // Quotes alone do not prevent spreadsheet programs from evaluating formulas.
  if (typeof value === 'string' && (/^[\t\r\n]/.test(text) || /^\s*[=+\-@]/.test(text)))
    text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function observationCsv(events: readonly ObservedEvent[]): string {
  const rows = events.map((event) => {
    const message = event.message;
    const navigation = message.type === 'navigation' ? message : null;
    return [
      event.sequence,
      event.received_at,
      event.bridge_session,
      event.source,
      message.type,
      navigation?.robot_id,
      message.request_id,
      navigation?.state,
      navigation?.completed_waypoints,
      navigation?.total_waypoints,
      navigation?.distance_remaining,
      message.type === 'error' ? message.message : message.error,
    ];
  });
  return [columns, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
