import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { isTestTeam, paths, type GamePlayer, type Position } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';

// Someone in the game, with where they last were. Hosts see names from the
// game's player list, never anyone's profile or email.
export type HostPlayer = GamePlayer & { position: Position | null };

export function usePlayers(gameId: string | undefined): Live<HostPlayer[]> {
  const players = useLiveQuery(
    gameId ? `players:${gameId}` : null,
    () => collection(db, paths.players(gameId!)),
    (id, data) => ({ ...data, uid: id }) as GamePlayer,
  );
  const positions = useLiveQuery(
    gameId ? `positions:${gameId}` : null,
    () => collection(db, paths.positions(gameId!)),
    (id, data) => ({ ...data, uid: id }) as Position,
  );
  return useMemo<Live<HostPlayer[]>>(() => {
    if (players.status !== 'ready') return players;
    const byUid = new Map((positions.status === 'ready' ? positions.data : []).map(p => [p.uid, p]));
    // Whoever is testing on a test run's team isn't in the race
    const inRace = players.data.filter(p => !isTestTeam(p.teamId));
    return { status: 'ready', data: inRace.map(p => ({ ...p, position: byUid.get(p.uid) ?? null })) };
  }, [players, positions]);
}
