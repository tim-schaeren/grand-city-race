import { host } from './api';

// Pushes go through the server, which checks this is a host of the game and
// looks the players' tokens up itself; the console never sees them.

// Players walk around with the phone pocketed, so a host's reply needs a nudge
export async function sendPushToTeam(gameId, teamId, title, body) {
  try {
    await host('sendPush', { gameId, teamId, title, body });
  } catch {
    // Push is best-effort; the message itself is already saved
  }
}

// Every player in a game
export async function sendPushToPlayers(gameId, title, body) {
  try {
    await host('sendPush', { gameId, title, body });
  } catch {
    // Push is best-effort; the game action itself has already been saved
  }
}
