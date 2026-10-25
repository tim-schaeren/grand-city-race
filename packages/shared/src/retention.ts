import type { Game } from './types';

// How long a race's location trails are kept. The recap keeps its own
// simplified team routes, so only those remain afterwards.

const DAY = 24 * 60 * 60 * 1000;

// A week after the race ends
export const TRAIL_KEPT_MS = 7 * DAY;
// A race nobody ended counts as over this long after its start
export const UNENDED_RACE_MS = 30 * DAY;
// Hosts of such a race are told this long before its trails go
export const TRAIL_NOTICE_MS = 7 * DAY;

type GameDates = Pick<Game, 'startDateTime' | 'endedAt'> & { trailClearedAt?: number | null };

// When a race's trails are deleted, or null once they are gone
export function trailDeletionAt(game: GameDates): number | null {
  if (game.trailClearedAt) return null;
  return game.endedAt ? game.endedAt + TRAIL_KEPT_MS : game.startDateTime + UNENDED_RACE_MS;
}

// A race nobody ended whose trails go within the notice period
export function unendedRaceNotice(game: GameDates, now: number): number | null {
  const at = trailDeletionAt(game);
  return !game.endedAt && at !== null && now >= at - TRAIL_NOTICE_MS ? at : null;
}
