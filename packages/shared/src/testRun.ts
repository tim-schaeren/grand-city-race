// A test run: before the race, a host plays it on a phone on a hidden test
// team, while the console moves the team along, gives it coins, and curses or
// robs it as a second hidden team, the test rival. Neither team shows to
// players, in the standings or in the recap, and both go when the race starts.

export const TEST_TEAM_ID = 'test';
export const TEST_RIVAL_ID = 'test-rival';

export const isTestTeam = (teamId: string | null | undefined): boolean =>
  teamId === TEST_TEAM_ID || teamId === TEST_RIVAL_ID;

// The app opens these links; the code keeps strangers off the test team
const SCHEME = 'grandcityrace';

export const testLink = (gameId: string, code: string) => `${SCHEME}://test/${gameId}/${code}`;

export function parseTestLink(url: string): { gameId: string; code: string } | null {
  const match = new RegExp(`^${SCHEME}://test/([A-Za-z0-9_-]+)/([A-Za-z0-9]+)$`).exec(url.trim());
  return match ? { gameId: match[1], code: match[2] } : null;
}
