import { copy } from './copy';

const pad = (n: number) => String(n).padStart(2, '0');

function split(ms: number) {
  return {
    h: Math.floor(ms / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  };
}

// A race time, e.g. "1h 05m 09s"; a dash when there is none
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '—';
  const { h, m, s } = split(ms);
  return copy.common.duration(h, m, s);
}

// A countdown clock, e.g. "01:05:09"
export function formatClock(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const { h, m, s } = split(ms);
  return [h, m, s].map(pad).join(':');
}

// What is left of an item, e.g. "4:05", rounded up so it never reads 0:00 early
export function formatMinutesLeft(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}
