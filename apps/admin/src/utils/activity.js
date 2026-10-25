import { addDoc, collection } from 'firebase/firestore';
import { paths } from '@grandcityrace/shared';
import { db } from '../firebase';

// A host's note on a game's bulletin board. The race's own entries are
// written by the server.
export async function logActivity(gameId, entry) {
  await addDoc(collection(db, paths.activity(gameId)), {
    at: Date.now(),
    visibility: 'public',
    teamId: null,
    teamName: null,
    ...entry,
  });
}
