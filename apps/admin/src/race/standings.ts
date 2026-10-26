import type { Team } from '@grandcityrace/shared';

// The race's order: finished teams by when they finished, then the rest by
// how many quests they've solved
export function rankTeams<T extends Pick<Team, 'finishedAt' | 'solvedCount'>>(teams: T[]): T[] {
  return [...teams].sort((a, b) => {
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    if (a.finishedAt) return -1;
    if (b.finishedAt) return 1;
    return (b.solvedCount ?? 0) - (a.solvedCount ?? 0);
  });
}
