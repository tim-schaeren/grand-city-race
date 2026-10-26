// Every address in the console, in one place: pages link through these,
// never by building paths of their own.

const game = (gameId: string) => `/games/${gameId}`;

export const to = {
  games: () => '/games',
  newGame: () => '/games/new',
  users: () => '/users',
  game,

  prepare: (gameId: string) => `${game(gameId)}/prepare`,
  overview: (gameId: string) => `${game(gameId)}/prepare/overview`,
  quests: (gameId: string) => `${game(gameId)}/prepare/quests`,
  shop: (gameId: string) => `${game(gameId)}/prepare/shop`,
  teams: (gameId: string) => `${game(gameId)}/prepare/teams`,
  testRun: (gameId: string) => `${game(gameId)}/prepare/test`,
  settings: (gameId: string) => `${game(gameId)}/prepare/settings`,

  race: (gameId: string) => `${game(gameId)}/race`,
  controls: (gameId: string) => `${game(gameId)}/race/controls`,
  map: (gameId: string) => `${game(gameId)}/race/map`,
  feed: (gameId: string) => `${game(gameId)}/race/feed`,
  chat: (gameId: string) => `${game(gameId)}/race/chat`,

  // A page for each thing in a game, whatever the phase
  team: (gameId: string, teamId: string) => `${game(gameId)}/teams/${teamId}`,
  quest: (gameId: string, questId: string) => `${game(gameId)}/quests/${questId}`,
  item: (gameId: string, item: string) => `${game(gameId)}/shop/${item}`,
  player: (gameId: string, uid: string) => `${game(gameId)}/players/${uid}`,

  after: (gameId: string) => `${game(gameId)}/after`,
  results: (gameId: string) => `${game(gameId)}/after/results`,
  recap: (gameId: string) => `${game(gameId)}/after/recap`,
};
