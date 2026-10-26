import { collection, query, where } from 'firebase/firestore';
import { paths, type TrailPoint } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';

// How far back the map reads the trail unless the whole race is asked for: a
// long race leaves tens of thousands of points, and every one read costs
const RECENT_LOAD_MS = 60 * 60 * 1000;

export function useTrail(gameId: string | undefined, wholeRace: boolean): Live<TrailPoint[]> {
  return useLiveQuery(
    gameId ? `trail:${gameId}:${wholeRace}` : null,
    () => wholeRace
      ? collection(db, paths.trail(gameId!))
      : query(collection(db, paths.trail(gameId!)), where('t', '>=', Date.now() - RECENT_LOAD_MS)),
    (_, data) => data as TrailPoint,
  );
}
