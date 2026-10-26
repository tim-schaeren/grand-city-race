import type { Transaction } from 'firebase-admin/firestore';
import {
  paths,
  checkGame,
  copy,
  hasStarted,
  normalizeQuest,
  pausedMsNow,
  isTestTeam,
  type ActivityEntry,
  type Game,
  type GamePlayer,
  type Quest,
  type QuestView,
  questView,
  type QuestProgress,
  type Team,
  type TeamState,
} from '@grandcityrace/shared';
import { db } from './firebase';
import { fail } from './input';

// Who is calling: their uid, and whether their sign-in carries the admin claim
export interface Caller {
  uid: string;
  admin: boolean;
}

export type GameWithId = Game & { id: string };

export async function readGame(tx: Transaction, gameId: string): Promise<GameWithId> {
  const snap = await tx.get(db.doc(paths.game(gameId)));
  if (!snap.exists) fail('not-found', copy.server.noGame);
  return { id: snap.id, ...snap.data() } as GameWithId;
}

export function canManage(game: Game, caller: Caller): boolean {
  return caller.admin || (game.hostIds ?? []).includes(caller.uid);
}

export function assertHost(game: Game, caller: Caller) {
  if (!canManage(game, caller)) fail('permission-denied', copy.server.hostsOnly);
}

export async function readQuest(tx: Transaction, gameId: string, questId: string): Promise<Quest | null> {
  const snap = await tx.get(db.doc(paths.quest(gameId, questId)));
  return snap.exists ? normalizeQuest(snap.id, snap.data()!) : null;
}

// ─── The race ────────────────────────────────────────────────────────────────

export type RaceStatus = 'waiting' | 'running' | 'paused' | 'ended';

// Decided by the server's clock, never a phone's
export function raceStatus(game: Game, now: number): RaceStatus {
  if (game.endedAt) return 'ended';
  if (game.pausedAt) return 'paused';
  if (!hasStarted(game, now)) return 'waiting';
  return 'running';
}

// What would break the race as it's set up now; the checker's problems
// depend on the game and its quests only
export async function gameProblems(game: Game, gameId: string) {
  const quests = await db.collection(paths.quests(gameId)).get();
  return checkGame({ game, quests: quests.docs.map(q => normalizeQuest(q.id, q.data())), players: [] })
    .filter(issue => issue.level === 'problem');
}

// Holds a race with problems before its start, so it doesn't begin by itself,
// and lets it go once they're fixed. A race held past its time stays held:
// the host starts it, rather than it starting the moment the last fix is saved.
export async function holdStart(gameId: string) {
  const ref = db.doc(paths.game(gameId));
  const snap = await ref.get();
  const game = snap.data() as Game | undefined;
  const now = Date.now();
  if (!game || game.endedAt || hasStarted(game, now)) return;
  if (game.startHeld && now >= game.startDateTime) return;
  const held = (await gameProblems(game, gameId)).length > 0;
  if (held !== !!game.startHeld) await ref.update({ startHeld: held, heldNoticeAt: null });
}

export function assertRunning(game: Game, now: number) {
  const status = raceStatus(game, now);
  if (status === 'ended') fail('failed-precondition', copy.server.gameOver);
  if (status === 'paused') fail('failed-precondition', copy.server.gamePaused);
  if (status === 'waiting') fail('failed-precondition', copy.server.notStarted);
}

// ─── A player and their team ─────────────────────────────────────────────────

export interface TeamContext {
  game: GameWithId;
  player: GamePlayer;
  team: Team;
  state: TeamState;
}

// The caller's place in a game: everything an action of theirs reads first
export async function readTeamContext(tx: Transaction, gameId: string, uid: string): Promise<TeamContext> {
  const game = await readGame(tx, gameId);
  const playerSnap = await tx.get(db.doc(paths.player(gameId, uid)));
  const player = playerSnap.data() as GamePlayer | undefined;
  if (!player) fail('permission-denied', copy.server.notInThisGame);
  if (!player.teamId) fail('failed-precondition', copy.server.notOnTeam);
  const [teamSnap, stateSnap] = await tx.getAll(
    db.doc(paths.team(gameId, player.teamId)),
    db.doc(paths.teamState(gameId, player.teamId)),
  );
  if (!teamSnap.exists || !stateSnap.exists) fail('failed-precondition', copy.server.notOnTeam);
  return {
    game,
    player,
    team: { id: teamSnap.id, ...teamSnap.data() } as Team,
    state: stateSnap.data() as TeamState,
  };
}

// The quest a team is on. Before its first solve that is the game's first
// quest, whatever the order was when the team was made; otherwise the first
// it hasn't solved.
export function currentQuestId(game: Game, team: Team, state: TeamState): string | null {
  if (team.finishedAt) return null;
  if (state.currentQuestId) return state.currentQuestId;
  const solved = new Set(state.completedQuestIds ?? []);
  return (game.questOrder ?? []).find(q => !solved.has(q)) ?? null;
}

// ─── What a team sees of its quest ───────────────────────────────────────────

// A team arriving at a quest: nothing walked, open at once if it has no trigger
export function arriveAt(quest: Quest, game: Game, now: number): QuestView {
  const open = quest.trigger === 'none';
  return questView(
    quest,
    {
      unlockedAt: open ? now : null,
      pausedMsAtUnlock: open ? pausedMsNow(game, now) : 0,
      walkedMeters: 0,
    },
    0,
  );
}

export function progressOf(view: QuestView): QuestProgress {
  return {
    unlockedAt: view.unlockedAt,
    pausedMsAtUnlock: view.pausedMsAtUnlock,
    walkedMeters: view.walkedMeters,
    ...(view.editedAt ? { editedAt: view.editedAt } : {}),
  };
}

// ─── Writing ─────────────────────────────────────────────────────────────────

type NewEntry = Omit<ActivityEntry, 'id'>;

export function logActivity(tx: Transaction, gameId: string, entry: NewEntry, entryId?: string) {
  const collection = db.collection(paths.activity(gameId));
  // What a test run's teams do stays between them and the hosts
  const visible = isTestTeam(entry.teamId) ? { ...entry, visibility: 'team' as const } : entry;
  tx.set(entryId ? collection.doc(entryId) : collection.doc(), visible);
}

export function teamRefs(gameId: string, teamId: string) {
  return {
    team: db.doc(paths.team(gameId, teamId)),
    state: db.doc(paths.teamState(gameId, teamId)),
  };
}
