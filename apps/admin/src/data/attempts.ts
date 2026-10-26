import { collection, orderBy, query } from 'firebase/firestore';
import { paths, type AnswerAttempt } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';

// Wrong answers teams typed, newest first
export function useAttempts(gameId: string | undefined): Live<AnswerAttempt[]> {
  return useLiveQuery(
    gameId ? `attempts:${gameId}` : null,
    () => query(collection(db, paths.attempts(gameId!)), orderBy('at', 'desc')),
    (id, data) => ({ id, ...data }) as AnswerAttempt,
  );
}
