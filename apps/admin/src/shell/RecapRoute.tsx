import { useParams } from 'react-router-dom';
import { consoleCopy as cc, copy } from '@grandcityrace/shared';
import { useGame } from '../data/games';
import RecapPanel from '../components/RecapPanel';
import { Page } from '../ui/Page';
import { Show, Empty } from '../ui/States';

// After the race: the recap, built, looked at, and shown to players
export function RecapRoute() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  return (
    <Page title={cc.shell.recap}>
      <Show live={game} isEmpty={g => !g} empty={<Empty title={copy.server.noGame} />}>
        {g => <RecapPanel gameId={gameId} game={g} />}
      </Show>
    </Page>
  );
}
