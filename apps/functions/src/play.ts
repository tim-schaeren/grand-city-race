import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import {
  questView,
  paths,
  copy,
  gameEconomy,
  shopConfig,
  teamCoins,
  hintsRevealedFor,
  curseMsLeft,
  compassMsLeft,
  radarMsLeft,
  metersBetween,
  pausedMsNow,
  normalizeJoinCode,
  isValidJoinCode,
  hintRevealedId,
  MAX_TEAMS_PER_GAME,
  TEAM_COLORS,
  SHOP_ITEMS_BY_TYPE,
  TEST_TEAM_ID,
  isTestTeam,
  type GamePlayer,
  type Position,
  type Team,
  type TeamState,
} from '@grandcityrace/shared';
import { db } from './lib/firebase';
import { fail, id, text, int, point, oneOf } from './lib/input';
import { once } from './lib/once';
import {
  readGame,
  readTeamContext,
  progressOf,
  logActivity,
  teamRefs,
  raceStatus,
  currentQuestId,
  type Caller,
  type TeamContext,
} from './lib/game';
import { readCurrentQuest, prepareSolve } from './lib/progress';
import { createTeam as newTeam, assignTeam, removeFromGame, isFull } from './lib/teams';
import { deleteAccount as deleteAccountData } from './lib/accounts';
import { applyItem, pushOutcome } from './lib/items';
import { assertPlaying, endTestRun, isPlaying } from './lib/testRun';

// A teammate's position older than this doesn't count for the spread check
const SPREAD_FRESH_MS = 5 * 60_000;

function assertNotCursed(state: TeamState, now: number) {
  if (curseMsLeft(state, now) > 0) fail('failed-precondition', copy.server.youreCursed);
}

function assertNotFinished(team: Team) {
  if (team.finishedAt) fail('failed-precondition', copy.server.raceOver);
}

// ─── Joining ─────────────────────────────────────────────────────────────────

async function joinGame(caller: Caller, data: Record<string, unknown>) {
  const code = normalizeJoinCode(String(data.code ?? ''));
  if (!isValidJoinCode(code)) fail('not-found', copy.join.noGame);
  const found = await db.collection(paths.games()).where('joinCode', '==', code).limit(1).get();
  if (found.empty) fail('not-found', copy.join.noGame);
  const game = found.docs[0];
  if (game.get('endedAt')) fail('failed-precondition', copy.join.finished);
  const profile = await db.doc(paths.user(caller.uid)).get();
  const ref = db.doc(paths.player(game.id, caller.uid));
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const player: GamePlayer = {
      uid: caller.uid,
      name: profile.get('name') ?? copy.common.namelessPlayer,
      teamId: null,
      joinedAt: Date.now(),
    };
    tx.set(ref, player);
  });
  return { gameId: game.id };
}

async function readPlayer(tx: Transaction, gameId: string, uid: string): Promise<GamePlayer> {
  const player = (await tx.get(db.doc(paths.player(gameId, uid)))).data() as GamePlayer | undefined;
  if (!player) fail('permission-denied', copy.server.notInThisGame);
  return player;
}

async function createTeam(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const name = typeof data.name === 'string' && data.name.trim() ? text(data.name, 40) : fail('invalid-argument', copy.server.teamName);
  const color = oneOf(data.color, TEAM_COLORS);
  return once(gameId, data.requestId, async (tx) => {
    const game = await readGame(tx, gameId);
    if (game.endedAt) fail('failed-precondition', copy.join.finished);
    const player = await readPlayer(tx, gameId, caller.uid);
    if (player.teamId) fail('failed-precondition', copy.server.alreadyOnTeam);
    const teams = await tx.get(db.collection(paths.teams(gameId)).select());
    if (teams.size >= MAX_TEAMS_PER_GAME) fail('failed-precondition', copy.server.gameFull);
    const teamId = newTeam(tx, game, { name, color }, [caller.uid]);
    tx.update(db.doc(paths.player(gameId, caller.uid)), { teamId });
    return { teamId };
  });
}

async function joinTeam(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const teamId = id(data.teamId);
  return once(gameId, data.requestId, async (tx) => {
    const game = await readGame(tx, gameId);
    if (game.endedAt) fail('failed-precondition', copy.join.finished);
    const player = await readPlayer(tx, gameId, caller.uid);
    if (player.teamId) fail('failed-precondition', copy.server.alreadyOnTeam);
    const teamSnap = await tx.get(db.doc(paths.team(gameId, teamId)));
    if (!teamSnap.exists) fail('not-found', copy.server.notInGame);
    if (isFull(game, { id: teamSnap.id, ...teamSnap.data() } as Team)) fail('failed-precondition', copy.server.teamFull);
    assignTeam(tx, gameId, player, teamId);
    return { teamId };
  });
}

async function leaveGame(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.doc(paths.player(gameId, caller.uid)));
    if (snap.exists) removeFromGame(tx, gameId, snap.data() as GamePlayer);
  });
  return {};
}

// ─── Playing ─────────────────────────────────────────────────────────────────

// Called when the game screen opens and when the race starts: gives the
// phone the server's time, and puts the team on its quest once the race runs
async function sync(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const testOver = await db.runTransaction(async (tx) => {
    let ctx: TeamContext;
    try {
      ctx = await readTeamContext(tx, gameId, caller.uid);
    } catch (e) {
      if (e instanceof HttpsError) return false;
      throw e;
    }
    const now = Date.now();
    // The race has started on its own with a test run still open
    if (isTestTeam(ctx.team.id) && raceStatus(ctx.game, now) !== 'waiting') return true;
    if (!isPlaying(ctx, now) || ctx.team.finishedAt) return false;
    const current = currentQuestId(ctx.game, ctx.team, ctx.state);
    if (!current || ctx.state.quest?.questId === current) return false;
    const { view } = await readCurrentQuest(tx, ctx, now);
    tx.update(teamRefs(gameId, ctx.team.id).state, { quest: view });
    return false;
  });
  if (testOver) await endTestRun(gameId);
  return {};
}

// Opening a host's test link: on the game's test team, ready to play before
// the race. Someone already playing in the game tests with another account.
async function joinTest(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const code = id(data.code);
  const profile = await db.doc(paths.user(caller.uid)).get();
  return db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    if (raceStatus(game, Date.now()) !== 'waiting') fail('failed-precondition', copy.server.testOver);
    const [stateSnap, playerSnap] = await tx.getAll(
      db.doc(paths.teamState(gameId, TEST_TEAM_ID)),
      db.doc(paths.player(gameId, caller.uid)),
    );
    if (!stateSnap.exists || (stateSnap.data() as TeamState).testCode !== code) fail('not-found', copy.server.testLinkWrong);
    const player = playerSnap.data() as GamePlayer | undefined;
    if (player && player.teamId !== TEST_TEAM_ID) fail('failed-precondition', copy.server.testAlreadyPlaying);
    const now = Date.now();
    // Joined now, so the app shows this game first
    tx.set(db.doc(paths.player(gameId, caller.uid)), {
      uid: caller.uid,
      name: profile.get('name') ?? copy.common.namelessPlayer,
      teamId: TEST_TEAM_ID,
      joinedAt: now,
    } satisfies GamePlayer);
    tx.update(db.doc(paths.team(gameId, TEST_TEAM_ID)), { memberIds: FieldValue.arrayUnion(caller.uid) });
    tx.update(db.doc(paths.game(gameId)), { testedAt: now });
    return { gameId, teamId: TEST_TEAM_ID };
  });
}

// The phone is inside a quest's fence; the server checks the position it sends
async function unlock(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const questId = id(data.questId);
  const at = point(data.lat, data.lng);
  return once(gameId, data.requestId, async (tx) => {
    const now = Date.now();
    const ctx = await readTeamContext(tx, gameId, caller.uid);
    assertPlaying(ctx, now);
    assertNotCursed(ctx.state, now);
    const { quest, view } = await readCurrentQuest(tx, ctx, now, questId);
    if (view.unlockedAt) return { unlocked: true };
    if (quest.trigger !== 'location' || !quest.location) fail('failed-precondition', copy.server.notOpenYet);
    // The same reading the phone used to decide it was inside
    if (metersBetween(at, quest.location) > (quest.fenceRadius ?? 50)) {
      fail('failed-precondition', copy.server.notThereYet);
    }
    const unlocked = questView(
      quest,
      { ...progressOf(view), unlockedAt: now, pausedMsAtUnlock: pausedMsNow(ctx.game, now) },
      hintsRevealedFor(ctx.state, quest.id),
    );
    tx.update(teamRefs(gameId, ctx.team.id).state, { quest: unlocked });
    return { unlocked: true };
  });
}

// How far the team has come on a distance quest, as one phone measured it.
// Any way of getting there counts, a train included.
async function reportDistance(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const questId = id(data.questId);
  const meters = int(data.meters, 0, 1_000_000);
  return once(gameId, data.requestId, async (tx) => {
    const now = Date.now();
    const ctx = await readTeamContext(tx, gameId, caller.uid);
    assertPlaying(ctx, now);
    // Distance walked while cursed doesn't count
    assertNotCursed(ctx.state, now);
    const { quest, view } = await readCurrentQuest(tx, ctx, now, questId);
    if (quest.trigger !== 'distance') fail('failed-precondition', copy.server.badRequest);
    if (view.unlockedAt) return { walkedMeters: view.walkedMeters, unlocked: true };
    const walked = Math.max(view.walkedMeters, meters);
    const reached = walked >= (quest.distanceMeters ?? 0);
    const next = questView(
      quest,
      {
        unlockedAt: reached ? now : null,
        pausedMsAtUnlock: reached ? pausedMsNow(ctx.game, now) : 0,
        walkedMeters: walked,
      },
      hintsRevealedFor(ctx.state, quest.id),
    );
    tx.update(teamRefs(gameId, ctx.team.id).state, { quest: next });
    return { walkedMeters: walked, unlocked: reached };
  });
}

// Moving on from a timer that has run out, or from a quest that is only read
async function continueQuest(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const questId = id(data.questId);
  return once(gameId, data.requestId, async (tx) => {
    const now = Date.now();
    const ctx = await readTeamContext(tx, gameId, caller.uid);
    assertPlaying(ctx, now);
    assertNotCursed(ctx.state, now);
    const { quest, view } = await readCurrentQuest(tx, ctx, now, questId);
    if (quest.task === 'answer') fail('failed-precondition', copy.server.badRequest);
    if (!view.unlockedAt) fail('failed-precondition', copy.server.notOpenYet);
    if (quest.task === 'timer') {
      const elapsed = now - view.unlockedAt - (pausedMsNow(ctx.game, now) - view.pausedMsAtUnlock);
      // A second's grace for the phone's clock
      if (elapsed < (quest.durationSeconds ?? 0) * 1000 - 1000) fail('failed-precondition', copy.server.timerRunning);
    }
    const solve = await prepareSolve(tx, ctx, quest.id);
    solve(now);
    return { solved: true };
  });
}

// Teammates must be close together to answer, if the race says so
async function assertTogether(tx: Transaction, ctx: TeamContext, now: number) {
  const limit = ctx.game.maxTeamSpreadMeters;
  if (!limit) return;
  const snap = await tx.get(db.collection(paths.positions(ctx.game.id)).where('teamId', '==', ctx.team.id));
  const fresh = snap.docs.map(d => d.data() as Position).filter(p => now - p.updatedAt < SPREAD_FRESH_MS);
  for (let i = 0; i < fresh.length; i++) {
    for (let j = i + 1; j < fresh.length; j++) {
      if (metersBetween(fresh[i], fresh[j]) > limit) fail('failed-precondition', copy.server.spreadOut);
    }
  }
}

const normalize = (s: string) => s.trim().toLowerCase();

async function answer(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const questId = id(data.questId);
  const given = text(data.text, 200);
  const at = data.lat === undefined ? null : point(data.lat, data.lng);
  return once(gameId, data.requestId, async (tx) => {
    const now = Date.now();
    const ctx = await readTeamContext(tx, gameId, caller.uid);
    assertPlaying(ctx, now);
    assertNotCursed(ctx.state, now);
    const { quest, view } = await readCurrentQuest(tx, ctx, now, questId);
    if (quest.task !== 'answer') fail('failed-precondition', copy.server.badRequest);
    // An answer at a place is given there
    if (quest.trigger === 'location' && quest.location) {
      if (!at || metersBetween(at, quest.location) > (quest.fenceRadius ?? 50)) {
        fail('failed-precondition', copy.server.notThereYet);
      }
    } else if (!view.unlockedAt) {
      fail('failed-precondition', copy.server.notOpenYet);
    }
    await assertTogether(tx, ctx, now);

    const correct = (quest.answers ?? []).some(a => normalize(a) === normalize(given));
    if (!correct) {
      // Recorded for the hosts, who can widen the answer list mid-race
      tx.set(db.collection(paths.attempts(gameId)).doc(), {
        questId: quest.id,
        teamId: ctx.team.id,
        teamName: ctx.team.name,
        text: given,
        at: now,
      });
      return { correct: false };
    }
    const solve = await prepareSolve(tx, ctx, quest.id);
    solve(now);
    return { correct: true };
  });
}

// ─── Spending ────────────────────────────────────────────────────────────────

async function revealHint(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const questId = id(data.questId);
  const index = int(data.index, 1, 50);
  return once(gameId, data.requestId, async (tx) => {
    const now = Date.now();
    const ctx = await readTeamContext(tx, gameId, caller.uid);
    assertPlaying(ctx, now);
    assertNotCursed(ctx.state, now);
    const { quest, view } = await readCurrentQuest(tx, ctx, now, questId);
    const revealed = hintsRevealedFor(ctx.state, quest.id);
    // The hint after the last one paid for, and no other: a retry or a
    // teammate's tap at the same moment doesn't pay twice
    if (index <= revealed) return { revealed };
    if (index !== revealed + 1 || index > (quest.hints ?? []).length) fail('failed-precondition', copy.server.noMoreHints);
    const economy = gameEconomy(ctx.game);
    const coins = teamCoins(ctx.state, economy);
    if (coins < economy.hintCost) fail('failed-precondition', copy.server.notEnoughCoins);
    tx.update(teamRefs(gameId, ctx.team.id).state, {
      coins: coins - economy.hintCost,
      [`hintsRevealed.${quest.id}`]: index,
      quest: questView(quest, progressOf(view), index),
    });
    // Only this team sees what it spends money on
    logActivity(tx, gameId, {
      type: 'hint_revealed',
      at: now,
      visibility: 'team',
      teamId: ctx.team.id,
      teamName: ctx.team.name,
      questId: quest.id,
      questTitle: quest.title,
      amount: economy.hintCost,
    }, hintRevealedId(ctx.team.id, quest.id, index));
    return { revealed: index };
  });
}

const FOR_OWN_TEAM = ['compass', 'radar', 'shield'] as const;
const ON_ANOTHER_TEAM = ['curse', 'robbery', 'donate'] as const;

// Items for the team's own use. Private to the team, so rivals don't see what it buys.
async function buyItem(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const type = oneOf(data.item, FOR_OWN_TEAM);
  return once(gameId, data.requestId, async (tx) => {
    const now = Date.now();
    const ctx = await readTeamContext(tx, gameId, caller.uid);
    assertPlaying(ctx, now);
    assertNotFinished(ctx.team);
    assertNotCursed(ctx.state, now);
    // The price at this moment, a flash sale included
    const config = shopConfig(ctx.game, now)[type];
    const definition = SHOP_ITEMS_BY_TYPE[type];
    if (!config.enabled) fail('failed-precondition', copy.server.notForSale(definition.name));
    const coins = teamCoins(ctx.state, gameEconomy(ctx.game));
    if (coins < config.price) fail('failed-precondition', copy.server.notEnoughCoins);

    const change: Record<string, unknown> = { coins: coins - config.price };
    const until = now + config.durationMinutes * 60000;
    if (type === 'compass' || type === 'radar') {
      // They only have a job while the team is still looking for a place
      const { quest, view } = await readCurrentQuest(tx, ctx, now);
      if (quest.trigger !== 'location' || !quest.location) fail('failed-precondition', copy.shop.nothingToPoint);
      if (view.unlockedAt) fail('failed-precondition', copy.shop.alreadyThere);
      const running = type === 'compass' ? compassMsLeft(ctx.state, now) : radarMsLeft(ctx.state, now);
      if (running > 0) fail('failed-precondition', copy.server.itemRunning(definition.name));
      change[type === 'compass' ? 'activeCompassUntil' : 'activeRadarUntil'] = until;
    } else {
      change.shields = FieldValue.increment(1);
    }
    tx.update(teamRefs(gameId, ctx.team.id).state, change);
    logActivity(tx, gameId, {
      type: 'item_bought',
      at: now,
      visibility: 'team',
      teamId: ctx.team.id,
      teamName: ctx.team.name,
      itemType: type,
      itemName: copy.items[type].bought,
      amount: config.price,
    });
    return { bought: type };
  });
}

// Items one team uses on another: one transaction checks everything, moves
// the coins, applies a shield, and records it
async function useItem(caller: Caller, data: Record<string, unknown>) {
  const gameId = id(data.gameId);
  const item = oneOf(data.item, ON_ANOTHER_TEAM);
  const targetTeamId = id(data.targetTeamId);
  const definition = SHOP_ITEMS_BY_TYPE[item];

  const result = await once(gameId, data.requestId, async (tx) => {
    const now = Date.now();
    const ctx = await readTeamContext(tx, gameId, caller.uid);
    assertPlaying(ctx, now);
    const config = shopConfig(ctx.game, now)[item];
    if (!config.enabled) fail('failed-precondition', copy.server.notForSale(definition.name));
    const economy = gameEconomy(ctx.game);
    const buyer = ctx.team;
    if (buyer.id === targetTeamId) fail('invalid-argument', copy.server.pickAnother);
    assertNotFinished(buyer);
    assertNotCursed(ctx.state, now);

    const target = teamRefs(gameId, targetTeamId);
    const [targetSnap, targetStateSnap] = await tx.getAll(target.team, target.state);
    if (!targetSnap.exists || !targetStateSnap.exists) fail('not-found', copy.server.notInGame);
    const targetTeam = { id: targetSnap.id, ...targetSnap.data() } as Team;
    const targetState = targetStateSnap.data() as TeamState;
    // A test run never touches the race's teams, nor they it
    if (isTestTeam(buyer.id) !== isTestTeam(targetTeam.id)) fail('failed-precondition', copy.server.testRivalOnly);

    const gift = item === 'donate' ? Math.floor(Number(data.amount)) : 0;
    if (item === 'donate' && !(gift > 0)) fail('invalid-argument', copy.server.chooseAmount);
    const buyerCoins = teamCoins(ctx.state, economy);
    const cost = config.price + gift;
    if (buyerCoins < cost) fail('failed-precondition', copy.server.notEnoughCoins);

    // Checked before anything is paid, since these aren't the buyer's gamble
    if (item === 'curse') {
      if (targetTeam.finishedAt) fail('failed-precondition', copy.server.alreadyFinished(targetTeam.name));
      if (curseMsLeft(targetState, now) > 0) fail('failed-precondition', copy.server.alreadyCursed(targetTeam.name));
    }
    if (item === 'robbery' && targetState.robbedAt && now - targetState.robbedAt < config.durationMinutes * 60000) {
      fail('failed-precondition', copy.server.robbedRecently(targetTeam.name));
    }

    return applyItem(tx, { gameId, item, config, economy, buyer, buyerCoins, target: targetTeam, targetState, gift, now });
  });

  await pushOutcome(item, result);
  return { outcome: result.outcome, targetTeamName: result.targetName, amount: result.amount };
}

async function deleteAccount(caller: Caller) {
  await deleteAccountData(caller.uid);
  return { deleted: true };
}

// ─── The function ────────────────────────────────────────────────────────────

type Action = (caller: Caller, data: Record<string, unknown>) => Promise<object>;

const ACTIONS: Record<string, Action> = {
  joinGame,
  createTeam,
  joinTeam,
  leaveGame,
  sync,
  joinTest,
  unlock,
  reportDistance,
  continueQuest,
  answer,
  revealHint,
  buyItem,
  useItem,
  deleteAccount,
};

// Everything a player does that decides a race. Every answer carries the
// server's time, so phones can set their clocks by it.
export const play = onCall(async (request) => {
  if (!request.auth) fail('unauthenticated', copy.network.signInFirst);
  const data = (request.data ?? {}) as Record<string, unknown>;
  const action = ACTIONS[String(data.action)];
  if (!action) fail('invalid-argument', copy.server.badRequest);
  const caller: Caller = { uid: request.auth.uid, admin: request.auth.token.admin === true };
  const result = await action(caller, data);
  return { ...result, serverTime: Date.now() };
});
