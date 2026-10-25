import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  hintsRevealedFor, paths, trailDeletionAt, TRAIL_KEPT_MS, UNENDED_RACE_MS, type Game, type TeamState,
} from '@grandcityrace/shared';
import { db } from './lib/firebase';
import { readQuest, questView, progressOf } from './lib/game';
import { buildAndSaveRecap } from './lib/recap';

// A host editing a quest mid-race: every team on it sees the change at once,
// keeping its progress and the hints it paid for
export const onQuestWritten = onDocumentWritten('games/{gameId}/quests/{questId}', async (event) => {
  const { gameId, questId } = event.params;
  const states = await db.collectionGroup('private').where('gameId', '==', gameId).get();
  for (const doc of states.docs) {
    if ((doc.data() as TeamState).quest?.questId !== questId) continue;
    await db.runTransaction(async (tx) => {
      const state = (await tx.get(doc.ref)).data() as TeamState | undefined;
      if (!state?.quest || state.quest.questId !== questId) return;
      const quest = await readQuest(tx, gameId, questId);
      tx.update(doc.ref, {
        quest: quest ? questView(quest, progressOf(state.quest), hintsRevealedFor(state, questId)) : null,
      });
    });
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

  // What retried requests were answered with is only needed for a day
  const requests = await db.collectionGroup('requests').where('at', '<', now - DAY).select().get();
  const writer = db.bulkWriter();
  requests.forEach(r => writer.delete(r.ref));
  await writer.close();
});
