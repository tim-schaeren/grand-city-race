import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { paths } from '@grandcityrace/shared';
import { db } from '../firebase';

// A game, live
export function useGame(gameId) {
  const [game, setGame] = useState(null);
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(
      doc(db, paths.game(gameId)),
      snap => setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => setGame(null),
    );
  }, [gameId]);
  return game;
}
