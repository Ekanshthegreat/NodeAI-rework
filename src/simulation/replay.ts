import type { Frame, Recording } from './engine';
/** Select the last captured state at or before an offset, without mutating the live fleet. */
export function replayFrame(record: Recording, offsetMs: number): Frame | null {
  if (!record.frames.length) return null;
  const target = record.frames[0].at + Math.max(0, Number.isFinite(offsetMs) ? offsetMs : 0);
  let low = 0,
    high = record.frames.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (record.frames[middle].at <= target) low = middle;
    else high = middle - 1;
  }
  return record.frames[low];
}
export function recordingDuration(record: Recording): number {
  return record.frames.length
    ? record.frames[record.frames.length - 1].at - record.frames[0].at
    : 0;
}
