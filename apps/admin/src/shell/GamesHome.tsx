import { Link } from 'react-router-dom';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useAuth } from '../hooks/useAuth';
import { useMyGames, phaseOf, type GameWithId } from '../data/games';
import { formatInZone, gameTimeZone } from '../utils/zonedTime';
import { Page } from '../ui/Page';
import { Show, Empty } from '../ui/States';
import { LinkButton } from '../ui/Button';
import { Status } from '../ui/Status';
import { to } from './to';
import { useNow } from './useNow';

// Every race a host runs, newest first, each opening on the phase it's in
export default function GamesHome() {
  const { user, isAdmin } = useAuth();
  const games = useMyGames(user?.uid, isAdmin);
  const now = useNow(60_000);

  return (
    <Page
      title={cc.gamesHome.title}
     
      actions={<LinkButton tone="primary" to={to.newGame()}>+ {cc.shell.newGame}</LinkButton>}
    >
      <Show
        live={games}
        isEmpty={list => list.length === 0}
        empty={(
          <Empty
            title={cc.gamesHome.welcome}
            hint={cc.gamesHome.welcomeHint}
            action={<LinkButton tone="primary" to={to.newGame()}>{cc.gamesHome.createFirst}</LinkButton>}
          />
        )}
      >
        {list => (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {[...list].sort((a, b) => b.startDateTime - a.startDateTime).map(game => (
              <li key={game.id}>
                <Link to={to.game(game.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-gray-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-900">{game.name}</span>
                    <span className="block text-sm text-gray-500">{game.city} · {when(game, now)}</span>
                  </span>
                  <GameStatus game={game} now={now} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Show>
    </Page>
  );
}

function when(game: GameWithId, now: number) {
  const zone = gameTimeZone(game);
  if (game.endedAt) return cc.gamesHome.endedOn({ when: formatInZone(game.endedAt, zone) });
  const start = formatInZone(game.startDateTime, zone);
  if (game.startHeld && now >= game.startDateTime) return cc.gamesHome.held;
  return now < game.startDateTime ? cc.gamesHome.starts({ when: start }) : cc.gamesHome.started({ when: start });
}

export function GameStatus({ game, now }: { game: GameWithId; now: number }) {
  const phase = phaseOf(game, now);
  if (phase === 'after') return <Status>{cc.gamePage.ended}</Status>;
  if (game.pausedAt) return <Status tone="warn">{cc.gamePage.paused}</Status>;
  if (phase === 'race') return <Status tone="good">{cc.gamePage.running}</Status>;
  return <Status>{cc.gamePage.upcoming}</Status>;
}
