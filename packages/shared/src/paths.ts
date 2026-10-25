// Where everything lives. Both apps and the server build paths here, so the
// data model is written down once. Everything a race produces sits under its game.

export const paths = {
  user: (uid: string) => `users/${uid}`,
  appSettings: () => 'settings/app',

  games: () => 'games',
  game: (gameId: string) => `games/${gameId}`,
  quests: (gameId: string) => `games/${gameId}/quests`,
  quest: (gameId: string, questId: string) => `games/${gameId}/quests/${questId}`,
  players: (gameId: string) => `games/${gameId}/players`,
  player: (gameId: string, uid: string) => `games/${gameId}/players/${uid}`,
  positions: (gameId: string) => `games/${gameId}/positions`,
  position: (gameId: string, uid: string) => `games/${gameId}/positions/${uid}`,
  trail: (gameId: string) => `games/${gameId}/trail`,
  teams: (gameId: string) => `games/${gameId}/teams`,
  team: (gameId: string, teamId: string) => `games/${gameId}/teams/${teamId}`,
  teamState: (gameId: string, teamId: string) => `games/${gameId}/teams/${teamId}/private/state`,
  coinLedger: (gameId: string, teamId: string) => `games/${gameId}/teams/${teamId}/coinLedger`,
  activity: (gameId: string) => `games/${gameId}/activity`,
  messages: (gameId: string) => `games/${gameId}/messages`,
  attempts: (gameId: string) => `games/${gameId}/attempts`,
  recap: (gameId: string) => `games/${gameId}/recap/summary`,
  requests: (gameId: string) => `games/${gameId}/requests`,
};
