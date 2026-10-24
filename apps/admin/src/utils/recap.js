import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { buildRecap, copy } from '@grandcityrace/shared';
import { db } from '../firebase';
import { sendPushToPlayers } from './push';

export const recapRef = gameId => doc(db, 'games', gameId, 'recap', 'summary');

// Built here, in the host's browser: hosts may read every team's trail and
// activity, and a long race's trail is more than a server function could
// read within its time limit. Building again keeps whether players see it.
export async function buildAndSaveRecap(gameId) {
  const [game, teams, activity, trail, existing] = await Promise.all([
    getDoc(doc(db, 'games', gameId)),
    getDocs(query(collection(db, 'teams'), where('gameId', '==', gameId))),
    getDocs(collection(db, 'games', gameId, 'activity')),
    getDocs(query(collection(db, 'trail'), where('gameId', '==', gameId))),
    getDoc(recapRef(gameId)),
  ]);
  const recap = buildRecap({
    game: { id: game.id, ...game.data() },
    teams: teams.docs.map(d => ({ id: d.id, ...d.data() })),
    activity: activity.docs.map(d => ({ id: d.id, ...d.data() })),
    trail: trail.docs.map(d => d.data()),
    now: Date.now(),
  });
  await setDoc(recapRef(gameId), {
    ...recap,
    publishedAt: existing.data()?.publishedAt ?? null,
    announcedAt: existing.data()?.announcedAt ?? null,
  });
}

// The game carries the moment too: the app watches the game, and can't watch
// a recap it isn't allowed to read yet. Players hear about it the first time
// it's shown, not every time.
export async function showRecap(gameId) {
  const announced = (await getDoc(recapRef(gameId))).data()?.announcedAt;
  const now = Date.now();
  await updateDoc(recapRef(gameId), { publishedAt: now, announcedAt: announced ?? now });
  await updateDoc(doc(db, 'games', gameId), { recapPublishedAt: now });
  if (!announced) await sendPushToPlayers(gameId, ...copy.hostPush.recap);
}

export async function hideRecap(gameId) {
  await updateDoc(recapRef(gameId), { publishedAt: null });
  await updateDoc(doc(db, 'games', gameId), { recapPublishedAt: null });
}

// A reset race has no history left to tell
export async function clearRecap(gameId) {
  await deleteDoc(recapRef(gameId));
  await updateDoc(doc(db, 'games', gameId), { recapPublishedAt: null });
}
