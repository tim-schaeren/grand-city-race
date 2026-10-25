import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { paths } from '@grandcityrace/shared';
import { db } from '../firebase';

// The people in a game, with their team and last known position. Names come
// from the game's player list, positions from the positions players write;
// hosts never see anyone's profile or email.
export function useGamePlayers(gameId) {
  const [members, setMembers] = useState([]);
  const [positions, setPositions] = useState({});

  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(
      collection(db, paths.players(gameId)),
      snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setMembers([]),
    );
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(
      collection(db, paths.positions(gameId)),
      snap => setPositions(Object.fromEntries(snap.docs.map(d => {
        const { lat, lng, updatedAt } = d.data();
        return [d.id, { lat, lng, updatedAt }];
      }))),
      () => setPositions({}),
    );
  }, [gameId]);

  return useMemo(
    () => members.map(m => ({ ...m, lastLocation: positions[m.id] ?? null })),
    [members, positions],
  );
}
