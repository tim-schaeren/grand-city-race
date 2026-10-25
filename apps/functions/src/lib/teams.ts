import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import {
  paths,
  gameEconomy,
  type Game,
  type GamePlayer,
  type Team,
  type TeamState,
} from '@grandcityrace/shared';
import { db } from './firebase';

// A new team, by a player or a host: in the standings at once, with the
// game's starting coins, and on the first quest once the race runs
export function createTeam(
  tx: Transaction,
  game: Game & { id: string },
  fields: { name: string; color: string },
  memberIds: string[],
): string {
  const ref = db.collection(paths.teams(game.id)).doc();
  const team: Omit<Team, 'id'> = {
    gameId: game.id,
    name: fields.name,
    color: fields.color,
    memberIds,
    solvedCount: 0,
    finishedAt: null,
  };
  const state: TeamState = {
    gameId: game.id,
    teamId: ref.id,
    coins: gameEconomy(game).startingCoins,
    currentQuestId: null,
    completedQuestIds: [],
    hintsRevealed: {},
    quest: null,
  };
  tx.set(ref, team);
  tx.set(db.doc(paths.teamState(game.id, ref.id)), state);
  return ref.id;
}

// Moves a player between teams, or off a team, keeping the player list and
// the teams' member lists in step. The caller has read the player first.
export function assignTeam(
  tx: Transaction,
  gameId: string,
  player: GamePlayer,
  teamId: string | null,
) {
  if (player.teamId === teamId) return;
  if (player.teamId) {
    tx.update(db.doc(paths.team(gameId, player.teamId)), { memberIds: FieldValue.arrayRemove(player.uid) });
  }
  if (teamId) {
    tx.update(db.doc(paths.team(gameId, teamId)), { memberIds: FieldValue.arrayUnion(player.uid) });
  }
  tx.update(db.doc(paths.player(gameId, player.uid)), { teamId });
}

// Takes a player out of a game altogether. Their team keeps its progress; it
// belongs to the team, not to any one member.
export function removeFromGame(tx: Transaction, gameId: string, player: GamePlayer) {
  if (player.teamId) {
    tx.update(db.doc(paths.team(gameId, player.teamId)), { memberIds: FieldValue.arrayRemove(player.uid) });
  }
  tx.delete(db.doc(paths.player(gameId, player.uid)));
  tx.delete(db.doc(paths.position(gameId, player.uid)));
}

export function isFull(game: Game, team: Team): boolean {
  return !!game.maxTeamSize && (team.memberIds ?? []).length >= game.maxTeamSize;
}
