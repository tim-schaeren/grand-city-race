import { collection, orderBy, query } from 'firebase/firestore';
import { paths, type CoinLedgerEntry } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';

// Hosts' changes to a team's coins, with their reasons, newest first
export function useCoinLedger(gameId: string | undefined, teamId: string | undefined): Live<CoinLedgerEntry[]> {
  return useLiveQuery(
    gameId && teamId ? `ledger:${gameId}:${teamId}` : null,
    () => query(collection(db, paths.coinLedger(gameId!, teamId!)), orderBy('at', 'desc')),
    (id, data) => ({ id, ...data }) as CoinLedgerEntry,
  );
}
