import {
  paths,
  buildRecap,
  isTestTeam,
  type ActivityEntry,
  type Game,
  type Team,
  type TeamState,
  type TrailPoint,
} from '@grandcityrace/shared';
import { db } from './firebase';

// Builds the recap from everything the race left: teams with their final
// balances, the activity feed and every trail point. Building again keeps
// whether players may see it.
export async function buildAndSaveRecap(gameId: string) {
  const gameRef = db.doc(paths.game(gameId));
  const recapRef = db.doc(paths.recap(gameId));
  const [gameSnap, teams, states, activity, trail, existing] = await Promise.all([
    gameRef.get(),
    db.collection(paths.teams(gameId)).get(),
    db.collectionGroup('private').where('gameId', '==', gameId).get(),
    db.collection(paths.activity(gameId)).get(),
    db.collection(paths.trail(gameId)).get(),
    recapRef.get(),
  ]);
  if (!gameSnap.exists) return null;
  const stateById = new Map(states.docs.map(d => [d.get('teamId') as string, d.data() as TeamState]));
  const recap = buildRecap({
    game: { id: gameId, ...gameSnap.data() } as Game,
    teams: teams.docs.filter(d => !isTestTeam(d.id)).map(d => {
      const state = stateById.get(d.id);
      return {
        id: d.id,
        ...(d.data() as Omit<Team, 'id'>),
        coins: state?.coins,
        shields: state?.shields,
        completedQuestIds: state?.completedQuestIds ?? [],
      };
    }),
    activity: activity.docs.map(d => ({ id: d.id, ...d.data() }) as ActivityEntry),
    trail: trail.docs.map(d => d.data() as TrailPoint),
    now: Date.now(),
  });
  await recapRef.set({
    ...recap,
    publishedAt: existing.get('publishedAt') ?? null,
    announcedAt: existing.get('announcedAt') ?? null,
  });
  return recap;
}
