import { onCall } from 'firebase-functions/v2/https';
import { FieldValue, type DocumentReference, type Query } from 'firebase-admin/firestore';
import {
  paths,
  copy,
  gameEconomy,
  teamCoins,
  pausedMsNow,
  questView,
  hintsRevealedFor,
  shopConfig,
  TEST_TEAM_ID,
  TEST_RIVAL_ID,
  isTestTeam,
  type Game,
  MAX_TEAMS_PER_GAME,
  TEAM_COLORS,
  type GamePlayer,
  type Team,
  type TeamState,
} from '@grandcityrace/shared';
import { db, auth, storage } from './lib/firebase';
import { fail, id, optionalId, text, int, oneOf } from './lib/input';
import { pushToPlayers, teamMemberIds } from './lib/push';
import { buildAndSaveRecap } from './lib/recap';
import {
  readGame,
  readQuest,
  assertHost,
  raceStatus,
  gameProblems,
  arriveAt,
  logActivity,
  teamRefs,
  type Caller,
  type GameWithId,
  type TeamContext,
} from './lib/game';
import { prepareSolve, readCurrentQuest } from './lib/progress';
import { applyItem, pushOutcome } from './lib/items';
import { assertBeforeStart, endTestRun, openTestRun, restartTestTeam } from './lib/testRun';
import { createTeam as newTeam, assignTeam, removeFromGame, isFull } from './lib/teams';

type Data = Record<string, unknown>;

async function hostName(caller: Caller): Promise<string> {
  const profile = await db.doc(paths.user(caller.uid)).get();
  return profile.get('name') ?? copy.server.aHost;
}

async function pushGame(gameId: string, [title, body]: readonly [string, string]) {
  await pushToPlayers(await teamMemberIds(gameId), title, body);
}

// ─── Running the race ────────────────────────────────────────────────────────

async function changeState(
  caller: Caller,
  gameId: string,
  change: (game: GameWithId, now: number) => Record<string, unknown> | null,
  type: 'game_started' | 'game_paused' | 'game_resumed' | 'game_ended',
) {
  const changed = await db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    assertHost(game, caller);
    const now = Date.now();
    const update = change(game, now);
    if (!update) return false;
    tx.update(db.doc(paths.game(gameId)), update);
    logActivity(tx, gameId, { type, at: now, visibility: 'public', teamId: null, teamName: null });
    return true;
  });
  return changed;
}

// What the game checker finds that would break the race. The race starting
// by itself at its time isn't stopped; starting it early is.
async function assertPlayable(caller: Caller, gameId: string) {
  const game = await db.doc(paths.game(gameId)).get();
  if (!game.exists) fail('not-found', copy.server.noGame);
  assertHost(game.data() as Game, caller);
  const problems = await gameProblems(game.data() as Game, gameId);
  if (problems.length) fail('failed-precondition', copy.server.notPlayable(problems.map(p => p.text).join(' ')));
}

async function start(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  await assertPlayable(caller, gameId);
  if (await changeState(caller, gameId, (game, now) => (game.endedAt ? null : { startDateTime: now, startHeld: false, heldNoticeAt: null }), 'game_started')) {
    // A test run ends where the race begins
    await endTestRun(gameId);
    await pushGame(gameId, copy.hostPush.started);
  }
  return {};
}

async function pause(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  if (await changeState(caller, gameId, (game, now) => (game.pausedAt || game.endedAt ? null : { pausedAt: now }), 'game_paused')) {
    await pushGame(gameId, copy.hostPush.paused);
  }
  return {};
}

async function resume(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const resumed = await changeState(caller, gameId, (game, now) => (game.pausedAt
    ? { pausedAt: null, totalPausedMs: pausedMsNow(game, now) }
    : null), 'game_resumed');
  if (resumed) await pushGame(gameId, copy.hostPush.resumed);
  return {};
}

async function end(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  if (await changeState(caller, gameId, (game, now) => (game.endedAt ? null : { endedAt: now }), 'game_ended')) {
    await pushGame(gameId, copy.hostPush.ended);
  }
  return {};
}

async function deleteAll(query: Query, writer: FirebaseFirestore.BulkWriter) {
  const snap = await query.select().get();
  snap.forEach(d => writer.delete(d.ref));
}

// Everything back to the start: the race's state, every team's progress and
// purse, and everything the race left behind. Players stay in their teams.
async function reset(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  // A new start, so the race waits for it rather than running again at once
  const startDateTime = typeof data.startDateTime === 'number' && data.startDateTime > Date.now()
    ? int(data.startDateTime, 0, Number.MAX_SAFE_INTEGER)
    : fail('invalid-argument', copy.server.startInFuture);
  const game = await db.runTransaction(tx => readGame(tx, gameId));
  assertHost(game, caller);
  const writer = db.bulkWriter();
  const teams = await db.collection(paths.teams(gameId)).get();
  for (const team of teams.docs) {
    const refs = teamRefs(gameId, team.id);
    writer.update(refs.team, { solvedCount: 0, finishedAt: null, pausedMsAtFinish: FieldValue.delete() });
    const state: TeamState = {
      gameId,
      teamId: team.id,
      coins: gameEconomy(game).startingCoins,
      currentQuestId: null,
      completedQuestIds: [],
      hintsRevealed: {},
      quest: null,
    };
    writer.set(refs.state, state);
    await deleteAll(db.collection(paths.coinLedger(gameId, team.id)), writer);
  }
  for (const path of [paths.positions, paths.trail, paths.activity, paths.attempts, paths.messages, paths.requests]) {
    await deleteAll(db.collection(path(gameId)), writer);
  }
  writer.delete(db.doc(paths.recap(gameId)));
  writer.update(db.doc(paths.game(gameId)), { startDateTime, endedAt: null, pausedAt: null, totalPausedMs: 0, recapPublishedAt: null });
  await writer.close();
  return {};
}

// A game and everything under it: quests, teams, players, the race's history
async function deleteGame(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  assertHost(await db.runTransaction(tx => readGame(tx, gameId)), caller);
  await db.recursiveDelete(db.doc(paths.game(gameId)));
  // Its pictures too. Storage may not be set up for a project yet, and the game is gone either way.
  try {
    await storage.bucket().deleteFiles({ prefix: `${paths.game(gameId)}/` });
  } catch (e) {
    console.warn('pictures not deleted', gameId, e);
  }
  return {};
}

// ─── Quests ──────────────────────────────────────────────────────────────────

// A quest gone, with every team on it moved on to the next one: a team on the
// last quest has finished. All in one step, so no team is left on a quest
// that no longer exists.
async function deleteQuest(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const questId = id(data.questId);
  await db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    assertHost(game, caller);
    const order = game.questOrder ?? [];
    const nextId = order[order.indexOf(questId) + 1] ?? null;
    const next = nextId ? await readQuest(tx, gameId, nextId) : null;
    const states = await tx.get(db.collectionGroup('private').where('gameId', '==', gameId));
    const teams = await tx.get(db.collection(paths.teams(gameId)));
    const now = Date.now();
    const running = raceStatus(game, now) === 'running';
    for (const doc of states.docs) {
      const state = doc.data() as TeamState;
      const team = teams.docs.find(t => t.id === state.teamId);
      const onIt = state.currentQuestId === questId || state.quest?.questId === questId;
      if (!team || !onIt || team.get('finishedAt')) continue;
      const entry = { at: now, visibility: 'team' as const, teamId: team.id, teamName: team.get('name') };
      if (next) {
        tx.update(doc.ref, { currentQuestId: nextId, quest: running || isTestTeam(team.id) ? arriveAt(next, game, now) : null });
        if (running) logActivity(tx, gameId, { ...entry, type: 'admin_moved', questId: next.id, questTitle: next.title });
      } else {
        tx.update(doc.ref, { currentQuestId: null, quest: null });
        tx.update(team.ref, { finishedAt: now, pausedMsAtFinish: pausedMsNow(game, now) });
        if (running) logActivity(tx, gameId, { ...entry, type: 'admin_finished' });
      }
    }
    tx.update(db.doc(paths.game(gameId)), { questOrder: order.filter(q => q !== questId) });
    tx.delete(db.doc(paths.quest(gameId, questId)));
  });
  return {};
}

// ─── Teams and players ───────────────────────────────────────────────────────

function teamFields(data: Data) {
  const name = typeof data.name === 'string' && data.name.trim() ? text(data.name, 40) : fail('invalid-argument', copy.server.teamName);
  return { name, color: oneOf(data.color, TEAM_COLORS) };
}

async function createTeam(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const fields = teamFields(data);
  return db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    assertHost(game, caller);
    const teams = await tx.get(db.collection(paths.teams(gameId)).select());
    if (teams.size >= MAX_TEAMS_PER_GAME) fail('failed-precondition', copy.server.gameFull);
    return { teamId: newTeam(tx, game, fields, []) };
  });
}

async function updateTeam(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const teamId = id(data.teamId);
  const fields = teamFields(data);
  await db.runTransaction(async (tx) => {
    assertHost(await readGame(tx, gameId), caller);
    const ref = db.doc(paths.team(gameId, teamId));
    if (!(await tx.get(ref)).exists) fail('not-found', copy.server.notInGame);
    tx.update(ref, fields);
  });
  return {};
}

async function deleteTeam(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const teamId = id(data.teamId);
  const game = await db.runTransaction(tx => readGame(tx, gameId));
  assertHost(game, caller);
  const writer = db.bulkWriter();
  const members = await db.collection(paths.players(gameId)).where('teamId', '==', teamId).get();
  members.forEach(m => writer.update(m.ref, { teamId: null }));
  await deleteAll(db.collection(paths.coinLedger(gameId, teamId)), writer);
  writer.delete(db.doc(paths.teamState(gameId, teamId)));
  writer.delete(db.doc(paths.team(gameId, teamId)));
  await writer.close();
  return {};
}

async function movePlayer(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const uid = id(data.uid);
  const teamId = optionalId(data.teamId);
  await db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    assertHost(game, caller);
    const player = (await tx.get(db.doc(paths.player(gameId, uid)))).data() as GamePlayer | undefined;
    if (!player) fail('not-found', copy.server.noPlayer);
    if (teamId) {
      const team = await tx.get(db.doc(paths.team(gameId, teamId)));
      if (!team.exists) fail('not-found', copy.server.notInGame);
      if (player.teamId !== teamId && isFull(game, { id: team.id, ...team.data() } as Team)) {
        fail('failed-precondition', copy.server.teamFull);
      }
    }
    assignTeam(tx, gameId, player, teamId);
  });
  return {};
}

// A host adds someone who has an account, by email, without them typing the code
async function addPlayer(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const email = text(data.email, 200).toLowerCase();
  const teamId = optionalId(data.teamId);
  let uid: string;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
  } catch {
    fail('not-found', copy.server.noAccount);
  }
  const profile = await db.doc(paths.user(uid)).get();
  await db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    assertHost(game, caller);
    const ref = db.doc(paths.player(gameId, uid));
    const existing = (await tx.get(ref)).data() as GamePlayer | undefined;
    const team = teamId ? await tx.get(db.doc(paths.team(gameId, teamId))) : null;
    if (team && !team.exists) fail('not-found', copy.server.notInGame);
    if (team && existing?.teamId !== teamId && isFull(game, { id: team.id, ...team.data() } as Team)) {
      fail('failed-precondition', copy.server.teamFull);
    }
    const player: GamePlayer = existing ?? {
      uid,
      name: profile.get('name') ?? copy.common.namelessPlayer,
      teamId: null,
      joinedAt: Date.now(),
    };
    if (!existing) tx.set(ref, player);
    if (teamId) assignTeam(tx, gameId, player, teamId);
  });
  return { uid };
}

async function removePlayer(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const uid = id(data.uid);
  await db.runTransaction(async (tx) => {
    assertHost(await readGame(tx, gameId), caller);
    const player = (await tx.get(db.doc(paths.player(gameId, uid)))).data() as GamePlayer | undefined;
    if (player) removeFromGame(tx, gameId, player);
  });
  return {};
}

// ─── Fixing a team's race ────────────────────────────────────────────────────

async function readTeam(tx: FirebaseFirestore.Transaction, game: GameWithId, teamId: string): Promise<TeamContext> {
  const refs = teamRefs(game.id, teamId);
  const [team, state] = await tx.getAll(refs.team, refs.state);
  if (!team.exists || !state.exists) fail('not-found', copy.server.notInGame);
  return {
    game,
    player: { uid: '', name: '', teamId, joinedAt: 0 },
    team: { id: team.id, ...team.data() } as Team,
    state: state.data() as TeamState,
  };
}

// Adds or takes coins, with the reason on record for the team
async function adjustCoins(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const teamId = id(data.teamId);
  const delta = int(data.delta, -100_000, 100_000);
  const reason = text(data.reason, 200, { required: false });
  const byName = await hostName(caller);
  return db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    assertHost(game, caller);
    const { team, state } = await readTeam(tx, game, teamId);
    const now = Date.now();
    const balanceAfter = Math.max(0, teamCoins(state, gameEconomy(game)) + delta);
    const refs = teamRefs(gameId, teamId);
    tx.update(refs.state, { coins: balanceAfter });
    tx.set(db.collection(paths.coinLedger(gameId, teamId)).doc(), { delta, reason, balanceAfter, byName, at: now });
    // Only the team itself sees what it was given or charged
    logActivity(tx, gameId, {
      type: 'coins_adjusted', at: now, visibility: 'team', teamId, teamName: team.name, amount: delta, reason,
    });
    return { balanceAfter };
  });
}

// A host's fix to where a team stands, told to that team
async function teamProgress(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const teamId = id(data.teamId);
  const type = oneOf(data.type, ['solve', 'move', 'finish', 'unfinish'] as const);
  const questId = type === 'solve' || type === 'move' ? id(data.questId) : null;
  await db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    assertHost(game, caller);
    const ctx = await readTeam(tx, game, teamId);
    const quest = questId ? await readQuest(tx, gameId, questId) : null;
    if (questId && !quest) fail('not-found', copy.quest.none);
    const order = game.questOrder ?? [];
    const refs = teamRefs(gameId, teamId);
    const now = Date.now();
    const running = raceStatus(game, now) === 'running';
    const entry = { at: now, visibility: 'team' as const, teamId, teamName: ctx.team.name };

    if (type === 'solve') {
      const solve = await prepareSolve(tx, ctx, questId!);
      solve(now, { byHost: true });
      logActivity(tx, gameId, { ...entry, type: 'admin_marked_solved', questId: quest!.id, questTitle: quest!.title });
    }
    if (type === 'move') {
      // The team then stands where it would have got to by itself: everything
      // before that quest solved, nothing from it on, so it plays them again
      const solved = order.slice(0, Math.max(0, order.indexOf(questId!)));
      tx.update(refs.state, {
        currentQuestId: questId,
        completedQuestIds: solved,
        quest: running ? arriveAt(quest!, game, now) : null,
      });
      tx.update(refs.team, { solvedCount: solved.length, finishedAt: null, pausedMsAtFinish: FieldValue.delete() });
      logActivity(tx, gameId, { ...entry, type: 'admin_moved', questId: quest!.id, questTitle: quest!.title });
    }
    if (type === 'finish') {
      tx.update(refs.team, { finishedAt: now, pausedMsAtFinish: pausedMsNow(game, now) });
      tx.update(refs.state, { quest: null });
      logActivity(tx, gameId, { ...entry, type: 'admin_finished' });
    }
    if (type === 'unfinish') {
      // Back on the first quest it hasn't solved
      const next = order.find(q => !ctx.state.completedQuestIds.includes(q)) ?? null;
      const nextQuest = next && running ? await readQuest(tx, gameId, next) : null;
      tx.update(refs.team, { finishedAt: null, pausedMsAtFinish: FieldValue.delete() });
      tx.update(refs.state, { currentQuestId: next, quest: nextQuest ? arriveAt(nextQuest, game, now) : null });
      logActivity(tx, gameId, { ...entry, type: 'admin_unfinished' });
    }
  });
  return {};
}

// ─── Hosts, push, recap ──────────────────────────────────────────────────────

// Finding someone by email needs every account, which hosts can't read, so it
// happens here: a host names a co-host by email and never sees anyone's account
async function hosts(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const action = oneOf(data.do ?? 'list', ['list', 'add', 'remove'] as const);
  const gameRef = db.doc(paths.game(gameId));
  const game = await db.runTransaction(tx => readGame(tx, gameId));
  assertHost(game, caller);
  if (action === 'add') {
    const email = text(data.email, 200).toLowerCase();
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(email)).uid;
    } catch {
      fail('not-found', copy.server.noAccount);
    }
    await gameRef.update({ hostIds: FieldValue.arrayUnion(uid) });
  }
  if (action === 'remove') {
    const uid = id(data.uid);
    const hostIds = game.hostIds ?? [];
    if (!hostIds.includes(uid)) fail('not-found', copy.server.notAHost);
    // A game always keeps someone who can run it
    if (hostIds.length <= 1) fail('failed-precondition', copy.server.lastHost);
    await gameRef.update({ hostIds: FieldValue.arrayRemove(uid) });
  }
  // Names only: co-hosts see who else runs the game, not their accounts
  const ids = ((await gameRef.get()).get('hostIds') as string[] | undefined) ?? [];
  const profiles = ids.length ? await db.getAll(...ids.map(uid => db.doc(paths.user(uid)) as DocumentReference)) : [];
  return { hosts: ids.map((uid, i) => ({ uid, name: profiles[i]?.get('name') ?? copy.server.aHost })) };
}

async function sendPush(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const teamId = optionalId(data.teamId);
  const title = text(data.title, 100);
  const body = text(data.body, 300, { required: false });
  assertHost(await db.runTransaction(tx => readGame(tx, gameId)), caller);
  const uids = await teamMemberIds(gameId, teamId);
  await pushToPlayers(uids, title, body);
  return { sent: uids.length };
}

async function recap(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const action = oneOf(data.do, ['build', 'show', 'hide'] as const);
  assertHost(await db.runTransaction(tx => readGame(tx, gameId)), caller);
  const recapRef = db.doc(paths.recap(gameId));
  const gameRef = db.doc(paths.game(gameId));
  if (action === 'build') {
    await buildAndSaveRecap(gameId);
    return {};
  }
  if (action === 'hide') {
    await recapRef.update({ publishedAt: null });
    await gameRef.update({ recapPublishedAt: null });
    return {};
  }
  // The game carries the moment too: the app watches the game, and can't
  // watch a recap it isn't allowed to read yet. Players hear about it the
  // first time it's shown, not every time.
  const existing = await recapRef.get();
  if (!existing.exists) fail('failed-precondition', copy.server.badRequest);
  const announced = existing.get('announcedAt') as number | null;
  const now = Date.now();
  await recapRef.update({ publishedAt: now, announcedAt: announced ?? now });
  await gameRef.update({ recapPublishedAt: now });
  if (!announced) await pushGame(gameId, copy.hostPush.recap);
  return {};
}

// ─── A test run ──────────────────────────────────────────────────────────────

// The console's side of a test run: open it (or give it a new link), end it,
// move the test team along, and attack it as the test rival. Coins go through
// adjustCoins like any team's.
async function testRun(caller: Caller, data: Data) {
  const gameId = id(data.gameId);
  const type = oneOf(data.type, ['open', 'end', 'arrive', 'move', 'restart', 'curse', 'robbery'] as const);
  if (type === 'end') {
    assertHost(await db.runTransaction(tx => readGame(tx, gameId)), caller);
    await endTestRun(gameId);
    return {};
  }
  const questId = type === 'move' ? id(data.questId) : null;
  const result = await db.runTransaction(async (tx) => {
    const game = await readGame(tx, gameId);
    assertHost(game, caller);
    const now = Date.now();
    assertBeforeStart(game, now);
    if (type === 'open') return { code: await openTestRun(tx, game) };

    const ctx = await readTeam(tx, game, TEST_TEAM_ID);
    const refs = teamRefs(gameId, TEST_TEAM_ID);
    if (type === 'restart') {
      restartTestTeam(tx, game, ctx.state);
      return {};
    }
    if (type === 'arrive') {
      // As if a phone were inside the fence, or the distance walked
      const { quest, view } = await readCurrentQuest(tx, ctx, now);
      if (view.unlockedAt) return {};
      tx.update(refs.state, {
        quest: questView(quest, { unlockedAt: now, pausedMsAtUnlock: 0, walkedMeters: quest.distanceMeters ?? view.walkedMeters }, hintsRevealedFor(ctx.state, quest.id)),
      });
      return {};
    }
    if (type === 'move') {
      const quest = await readQuest(tx, gameId, questId!);
      if (!quest) fail('not-found', copy.quest.none);
      const order = game.questOrder ?? [];
      const solved = order.slice(0, Math.max(0, order.indexOf(questId!)));
      tx.update(refs.state, { currentQuestId: questId, completedQuestIds: solved, quest: arriveAt(quest, game, now) });
      tx.update(refs.team, { solvedCount: solved.length, finishedAt: null });
      return {};
    }
    // The rival uses an item on the test team, as a team in the race would
    const rival = await readTeam(tx, game, TEST_RIVAL_ID);
    const economy = gameEconomy(game);
    return applyItem(tx, {
      gameId, item: type, config: shopConfig(game, now)[type], economy,
      buyer: rival.team, buyerCoins: teamCoins(rival.state, economy),
      target: ctx.team, targetState: ctx.state, gift: 0, now,
    });
  });
  if (type === 'curse' || type === 'robbery') await pushOutcome(type, result as ReturnType<typeof applyItem>);
  return type === 'open' ? result : {};
}

// ─── The function ────────────────────────────────────────────────────────────

type Action = (caller: Caller, data: Data) => Promise<object>;

const ACTIONS: Record<string, Action> = {
  start,
  pause,
  resume,
  end,
  reset,
  deleteGame,
  createTeam,
  updateTeam,
  deleteTeam,
  movePlayer,
  addPlayer,
  removePlayer,
  adjustCoins,
  teamProgress,
  hosts,
  sendPush,
  recap,
  testRun,
  deleteQuest,
};

// What a game's hosts do to run it. Their own content (quests, their order,
// the game's settings) they write directly; this is what decides a race.
export const host = onCall({ timeoutSeconds: 300 }, async (request) => {
  if (!request.auth) fail('unauthenticated', copy.network.signInFirst);
  const data = (request.data ?? {}) as Data;
  const action = ACTIONS[String(data.action)];
  if (!action) fail('invalid-argument', copy.server.badRequest);
  const caller: Caller = { uid: request.auth.uid, admin: request.auth.token.admin === true };
  return action(caller, data);
});
