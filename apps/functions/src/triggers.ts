import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  copy, hasStarted, hintsRevealedFor, paths, questView, trailDeletionAt, TRAIL_KEPT_MS, UNENDED_RACE_MS,
  type ActivityEntry, type Game, type QuestView, type TeamState,
} from '@grandcityrace/shared';
import { db } from './lib/firebase';
import { holdStart, readQuest, progressOf } from './lib/game';
import { pushToPlayers } from './lib/push';
import { buildAndSaveRecap } from './lib/recap';
import { endTestRun } from './lib/testRun';

// What a team reads of a quest, to tell whether an edit changed it
const readable = (view: QuestView) => JSON.stringify([view.navigationHint, view.title, view.description, view.hints]);

// A host editing a quest mid-race: every team on it sees the change at once,
// keeping its progress and the hints it paid for, and is told the quest was
// updated. The edit goes on the hosts' record.
export const onQuestWritten = onDocumentWritten('games/{gameId}/quests/{questId}', async (event) => {
  const { gameId, questId } = event.params;
  const now = Date.now();
  await holdStart(gameId);
  const states = await db.collectionGroup('private').where('gameId', '==', gameId).get();
  for (const doc of states.docs) {
    if ((doc.data() as TeamState).quest?.questId !== questId) continue;
    await db.runTransaction(async (tx) => {
      const state = (await tx.get(doc.ref)).data() as TeamState | undefined;
      if (!state?.quest || state.quest.questId !== questId) return;
      const quest = await readQuest(tx, gameId, questId);
      if (!quest) return tx.update(doc.ref, { quest: null });
      const hints = hintsRevealedFor(state, questId);
      const unchanged = questView(quest, progressOf(state.quest), hints);
      const changed = readable(unchanged) !== readable(state.quest);
      tx.update(doc.ref, {
        quest: changed ? questView(quest, { ...progressOf(state.quest), editedAt: now }, hints) : unchanged,
      });
    });
  }

  const after = event.data?.after;
  if (!after?.exists) return;
  const game = await db.doc(paths.game(gameId)).get();
  const g = game.data() as Game | undefined;
  if (!g || g.endedAt || !hasStarted(g, now)) return;
  const entry: Omit<ActivityEntry, 'id'> = {
    type: 'quest_edited',
    at: now,
    visibility: 'hosts',
    teamId: null,
    teamName: null,
    questId,
    questTitle: after.get('title'),
    questNumber: (g.questOrder ?? []).indexOf(questId) + 1 || undefined,
  };
  await db.collection(paths.activity(gameId)).add(Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined)));
});

// A game's start moved, or the game made: held if it has problems. Its own
// hold being set changes neither, so this doesn't run on.
export const onGameWritten = onDocumentWritten('games/{gameId}', async (event) => {
  const before = event.data?.before.data() as Game | undefined;
  const after = event.data?.after.data() as Game | undefined;
  if (!after) return;
  const moved = !before || before.startDateTime !== after.startDateTime || before.endedAt !== after.endedAt
    || JSON.stringify(before.questOrder) !== JSON.stringify(after.questOrder);
  if (moved) await holdStart(event.params.gameId);
});

// A held race's start time has come: its hosts hear it didn't begin
export const heldNotice = onSchedule({ schedule: 'every 5 minutes', timeZone: 'Europe/Zurich' }, async () => {
  const now = Date.now();
  const held = await db.collection(paths.games()).where('startHeld', '==', true).get();
  for (const game of held.docs) {
    const g = game.data() as Game;
    if (g.endedAt || g.heldNoticeAt || now < g.startDateTime) continue;
    await pushToPlayers(g.hostIds ?? [], ...copy.hostPush.held(g.name));
    await game.ref.update({ heldNoticeAt: now });
  }
});

const DAY = 24 * 60 * 60 * 1000;

// Deletes trails when retention.ts says they go; the console warns the hosts
// of a race nobody ended a week before
export const cleanup = onSchedule({ schedule: 'every day 04:00', timeZone: 'Europe/Zurich' }, async () => {
  const now = Date.now();
  const games = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const snap of [
    await db.collection(paths.games()).where('endedAt', '<', now - TRAIL_KEPT_MS).get(),
    await db.collection(paths.games()).where('startDateTime', '<', now - UNENDED_RACE_MS).get(),
  ]) snap.forEach(g => games.set(g.id, g));

  for (const game of games.values()) {
    const due = trailDeletionAt(game.data() as Game);
    if (due === null || due > now) continue;
    // The recap keeps its own simplified routes, so it is built first if a
    // host never did
    if (!(await db.doc(paths.recap(game.id)).get()).exists) await buildAndSaveRecap(game.id);
    await db.recursiveDelete(db.collection(paths.trail(game.id)));
    await game.ref.update({ trailClearedAt: now });
  }

  // Test runs of races that started without a host pressing Start
  const tests = await db.collectionGroup('teams').where('test', '==', true).select().get();
  for (const gameRef of new Map(tests.docs.map(t => [t.ref.parent.parent!.path, t.ref.parent.parent!])).values()) {
    const game = await gameRef.get();
    if (game.exists && hasStarted(game.data() as Game, now)) await endTestRun(game.id);
  }

  // What retried requests were answered with is only needed for a day
  const requests = await db.collectionGroup('requests').where('at', '<', now - DAY).select().get();
  const writer = db.bulkWriter();
  requests.forEach(r => writer.delete(r.ref));
  await writer.close();
});
