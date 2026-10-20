import { describe, expect, it } from 'vitest';
import { observationCsv } from './observationCsv';
import { filterObservations, parseObservations } from './observations';
import example from './example-observations.json';

describe('observation CSV export', () => {
  const record = parseObservations(JSON.stringify(example));
  it('exports only matching observations, keeping sessions and original sequences', () => {
    const events = filterObservations(record, '2', '', 'route-1');
    const csv = observationCsv(events);
    expect(csv.split('\r\n')).toHaveLength(4);
    expect(csv).toContain('"5","2026-10-17T12:00:09.000Z","2","test_fixture"');
    expect(csv).toContain('Localization is stale');
    expect(csv).toContain('Example rejection; no goal was sent to a robot.');
    expect(csv).not.toContain('"accepted"');
  });
  it('preserves zero distances and leaves unavailable error fields empty', () => {
    const csv = observationCsv(record.events);
    expect(csv).toContain('"succeeded","2","2","0",""');
    expect(csv).toContain('"error","","route-1","","","","",');
  });
  it('quotes commas, newlines, quotes and Unicode without changing the record', () => {
    const event = structuredClone(record.events[4]);
    if (event.message.type !== 'error') throw new Error('Expected error fixture');
    event.message.message = 'Robot 界, says "wait"\nRetry later';
    const csv = observationCsv([event]);
    expect(csv).toContain('"Robot 界, says ""wait""\nRetry later"');
    expect(event.message.message).toBe('Robot 界, says "wait"\nRetry later');
    expect(observationCsv([]).split('\r\n')).toHaveLength(2);
  });
  it('neutralizes spreadsheet formula prefixes in untrusted text', () => {
    for (const message of ['=1+1', '  +SUM(1,2)', '-2+3', '@SUM(1)', '\tformula', '\nformula']) {
      const event = structuredClone(record.events[4]);
      if (event.message.type !== 'error') throw new Error('Expected error fixture');
      event.message.message = message;
      expect(observationCsv([event])).toContain('"\'' + message.replace(/"/g, '""') + '"');
      expect(event.message.message).toBe(message);
    }
  });
});
