import { collection, limit, orderBy, query } from 'firebase/firestore';
import { paths, type ActivityEntry } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';

// Enough for a whole race; pages about one team, quest or item pick theirs out
const FEED_LIMIT = 1000;

// The game's feed, newest first. Hosts may read every entry, the teams' own included.
export function useActivity(gameId: string | undefined): Live<ActivityEntry[]> {
  return useLiveQuery(
    gameId ? `activity:${gameId}` : null,
    () => query(collection(db, paths.activity(gameId!)), orderBy('at', 'desc'), limit(FEED_LIMIT)),
    (id, data) => ({ id, ...data }) as ActivityEntry,
  );
}
