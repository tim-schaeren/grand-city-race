import { useState, useEffect, useMemo } from 'react';
import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { paths } from '@grandcityrace/shared';
import { db } from '../firebase';

// A game's teams as a host sees them: what everyone sees of each team, with
// its private state (coins, items, current quest, chat markers) merged in
export function useTeams(gameId) {
  const [teams, setTeams] = useState([]);
  const [states, setStates] = useState({});

  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(
      collection(db, paths.teams(gameId)),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setTeams([]),
    );
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(
      query(collectionGroup(db, 'private'), where('gameId', '==', gameId)),
      snap => setStates(Object.fromEntries(snap.docs.map(d => [d.get('teamId'), d.data()]))),
      () => setStates({}),
    );
  }, [gameId]);

  return useMemo(() => teams.map(t => ({ ...states[t.id], ...t })), [teams, states]);
}
