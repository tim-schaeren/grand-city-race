// How long a team took: from the start to its finish, without the time the
// race was paused before it finished. A pause after a team is in doesn't
// shorten that team's time.

interface PauseEntry {
  type: string;
  at: number;
}

// The time the race spent paused before a moment, from the pause and resume
// entries in its activity feed
export function pausedMsBefore(activity: PauseEntry[], until: number): number {
  const entries = activity
    .filter(e => e.type === 'game_paused' || e.type === 'game_resumed')
    .sort((a, b) => a.at - b.at);
  let paused = 0;
  let since: number | null = null;
  for (const e of entries) {
    if (e.at >= until) break;
    if (e.type === 'game_paused' && since === null) since = e.at;
    if (e.type === 'game_resumed' && since !== null) {
      paused += e.at - since;
      since = null;
    }
  }
  if (since !== null) paused += until - since;
  return paused;
}

// Whether the race has begun. One with problems in it is held, set by the
// server, and doesn't start by itself; only the host's Start does that.
export function hasStarted(game: { startDateTime: number; startHeld?: boolean }, now: number): boolean {
  return !game.startHeld && now >= game.startDateTime;
}

// What the pause total is at this moment, the way a finish records it:
// a running pause counts up to now
export function pausedMsNow(game: { totalPausedMs?: number | null; pausedAt?: number | null }, now: number): number {
  return (game.totalPausedMs ?? 0) + (game.pausedAt ? Math.max(0, now - game.pausedAt) : 0);
}

// A finished team's race time. Teams finished by a current build carry the
// pause total of their finish; for older ones the activity feed tells, when
// it's at hand, and otherwise all of the race's pauses count.
export function raceTimeMs(
  team: { finishedAt?: number | null; pausedMsAtFinish?: number | null },
  game: { startDateTime: number; totalPausedMs?: number | null },
  activity?: PauseEntry[],
): number | null {
  if (!team.finishedAt) return null;
  const paused = typeof team.pausedMsAtFinish === 'number'
    ? team.pausedMsAtFinish
    : activity
      ? pausedMsBefore(activity, team.finishedAt)
      : game.totalPausedMs ?? 0;
  return Math.max(0, team.finishedAt - game.startDateTime - paused);
}
