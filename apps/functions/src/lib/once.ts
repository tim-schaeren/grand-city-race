import type { Transaction } from 'firebase-admin/firestore';
import { paths } from '@grandcityrace/shared';
import { db } from './firebase';
import { optionalId } from './input';

// Runs an action in one transaction, at most once per request id. A phone
// that retries after a lost connection gets the first answer back instead of
// paying, solving or buying a second time. Old requests are cleared daily.
export async function once<T>(
  gameId: string,
  requestId: unknown,
  action: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const key = optionalId(requestId);
  return db.runTransaction(async (tx) => {
    const ref = key ? db.doc(`${paths.requests(gameId)}/${key}`) : null;
    if (ref) {
      const done = await tx.get(ref);
      if (done.exists) return done.data()!.result as T;
    }
    const result = await action(tx);
    if (ref) tx.set(ref, { result: result ?? null, at: Date.now() });
    return result;
  });
}
