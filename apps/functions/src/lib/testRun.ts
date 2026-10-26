import { randomBytes } from 'node:crypto';
import type { Transaction } from 'firebase-admin/firestore';
import {
  paths,
  copy,
  gameEconomy,
  isTestTeam,
  TEST_TEAM_ID,
  TEST_RIVAL_ID,
  type Team,
  type TeamState,
} from '@grandcityrace/shared';
import { db } from './firebase';
import { fail } from './input';
import { assertRunning, raceStatus, type GameWithId, type TeamContext } from './game';

// See testRun.ts in the shared package. The test teams play before the race
// does; everything else about them is an ordinary team.

const RIVAL_COINS = 1000; // enough to curse and rob the test team as often as the host likes

// The test team plays only while the race hasn't started; everyone else only
// while it runs
export function isPlaying(ctx: TeamContext, now: number): boolean {
  const status = raceStatus(ctx.game, now);
  return isTestTeam(ctx.team.id) ? status === 'waiting' : status === 'running';
}

export function assertPlaying(ctx: TeamContext, now: number) {
  if (!isTestTeam(ctx.team.id)) return assertRunning(ctx.game, now);
  if (raceStatus(ctx.game, now) !== 'waiting') fail('failed-precondition', copy.server.testOver);
}

export function assertBeforeStart(game: GameWithId, now: number) {
  if (raceStatus(game, now) !== 'waiting') fail('failed-precondition', copy.server.testBeforeStart);
}

// A fresh state at the start of the race, or with the rival's war chest
function freshState(game: GameWithId, teamId: string, coins: number, testCode?: string): TeamState {
  return {
    gameId: game.id,
    teamId,
    coins,
    currentQuestId: null,
    completedQuestIds: [],
    hintsRevealed: {},
    quest: null,
    ...(testCode ? { testCode } : {}),
  };
}

// Starts a test run, or gives a running one a new link: both teams made if
// they aren't there yet, and a new code, so an old link stops working
export async function openTestRun(tx: Transaction, game: GameWithId): Promise<string> {
  const code = randomBytes(9).toString('base64url').replace(/[-_]/g, '').slice(0, 12);
  const [team, rival] = await tx.getAll(db.doc(paths.team(game.id, TEST_TEAM_ID)), db.doc(paths.team(game.id, TEST_RIVAL_ID)));
  const make = (teamId: string, name: string, color: string) => {
    const fields: Omit<Team, 'id'> = { gameId: game.id, name, color, memberIds: [], solvedCount: 0, finishedAt: null, test: true };
    tx.set(db.doc(paths.team(game.id, teamId)), fields);
  };
  if (!team.exists) {
    make(TEST_TEAM_ID, copy.test.teamName, '#334155');
    tx.set(db.doc(paths.teamState(game.id, TEST_TEAM_ID)), freshState(game, TEST_TEAM_ID, gameEconomy(game).startingCoins, code));
  } else {
    tx.update(db.doc(paths.teamState(game.id, TEST_TEAM_ID)), { testCode: code });
  }
  if (!rival.exists) {
    make(TEST_RIVAL_ID, copy.test.rivalName, '#9d174d');
    tx.set(db.doc(paths.teamState(game.id, TEST_RIVAL_ID)), freshState(game, TEST_RIVAL_ID, RIVAL_COINS));
  }
  return code;
}

// The test team back at the start: quest 1, starting coins, nothing running.
// Its players stay on it, and the link keeps working.
export function restartTestTeam(tx: Transaction, game: GameWithId, state: TeamState) {
  tx.set(db.doc(paths.teamState(game.id, TEST_TEAM_ID)), freshState(game, TEST_TEAM_ID, gameEconomy(game).startingCoins, state.testCode));
  tx.update(db.doc(paths.team(game.id, TEST_TEAM_ID)), { solvedCount: 0, finishedAt: null });
}

// Everything a test run left behind: both teams, the players on the test team,
// and what they did. Run when the host ends the test, when the race starts,
// and by the daily cleanup for races that started on their own.
export async function endTestRun(gameId: string) {
  const writer = db.bulkWriter();
  const testIds = [TEST_TEAM_ID, TEST_RIVAL_ID];
  const players = await db.collection(paths.players(gameId)).where('teamId', 'in', testIds).select().get();
  for (const player of players.docs) {
    writer.delete(player.ref);
    writer.delete(db.doc(paths.position(gameId, player.id)));
  }
  const left = await Promise.all([
    db.collection(paths.trail(gameId)).where('teamId', 'in', testIds).select().get(),
    db.collection(paths.activity(gameId)).where('teamId', 'in', testIds).select().get(),
    db.collection(paths.activity(gameId)).where('targetTeamId', 'in', testIds).select().get(),
    db.collection(paths.attempts(gameId)).where('teamId', 'in', testIds).select().get(),
    db.collection(paths.messages(gameId)).where('teamId', 'in', testIds).select().get(),
  ]);
  left.forEach(snap => snap.forEach(d => writer.delete(d.ref)));
  for (const teamId of testIds) {
    const ledger = await db.collection(paths.coinLedger(gameId, teamId)).select().get();
    ledger.forEach(d => writer.delete(d.ref));
    writer.delete(db.doc(paths.teamState(gameId, teamId)));
    writer.delete(db.doc(paths.team(gameId, teamId)));
  }
  await writer.close();
}
