import { consoleCopy as cc, formatActivityTime } from '@grandcityrace/shared';

// "just now", "12 min ago", "3 h ago"
export function ago(at: number, now: number): string {
  const ms = Math.max(0, now - at);
  if (ms < 60_000) return cc.entities.justNow;
  if (ms < 3_600_000) return cc.entities.minAgo({ n: Math.floor(ms / 60_000) });
  return cc.entities.hoursAgo({ n: Math.floor(ms / 3_600_000) });
}

// "14:32" by the game's clock
export const clock = formatActivityTime;
