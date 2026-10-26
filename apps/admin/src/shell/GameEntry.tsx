import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useGame, phaseOf } from '../data/games';
import { Show, Empty } from '../ui/States';
import { copy } from '@grandcityrace/shared';
import { to } from './to';

// Opening a game lands on the phase it's in: preparing before the start,
// the race while it runs, the recap once it's over
export function GameEntry() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  const [now] = useState(() => Date.now());
  return (
    <Show live={game} isEmpty={g => !g} empty={<Empty title={copy.server.noGame} />}>
      {g => {
        const phase = phaseOf(g!, now);
        return <Navigate replace to={phase === 'after' ? to.results(gameId!) : phase === 'race' ? to.controls(gameId!) : to.overview(gameId!)} />;
      }}
    </Show>
  );
}
