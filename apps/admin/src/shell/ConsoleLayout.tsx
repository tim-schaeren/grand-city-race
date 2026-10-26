import { useState } from 'react';
import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { consoleCopy as cc, copy, unendedRaceNotice } from '@grandcityrace/shared';
import { auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { phaseOf, useGame, useMyGames, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { useChatUnread } from '../data/chat';
import { gameTimeZone } from '../utils/zonedTime';
import { setAppearance, useAppearance } from '../utils/appearance';
import { Menu, MenuItem } from '../ui/Menu';
import { LinkButton } from '../ui/Button';
import { Empty } from '../ui/States';
import { PhaseTabs, SubTabs, type Tab } from '../ui/Tabs';
import { GuideBar } from '../prepare/GuideBar';
import { useReadiness } from '../prepare/readiness';
import { Logo } from '../ui/Logo';
import { RaceBar } from './RaceBar';
import { useNow } from './useNow';
import { to } from './to';

const PHASES = ['prepare', 'race', 'after'] as const;

// The pages of each phase, in order
function phaseTabs(gameId: string, chatUnread: number): Record<'prepare' | 'race' | 'after', Tab[]> {
  return {
    prepare: [
      { to: to.overview(gameId), label: cc.shell.overview },
      { to: to.quests(gameId), label: cc.shell.quests },
      { to: to.shop(gameId), label: cc.shell.shop },
      { to: to.teams(gameId), label: cc.shell.teams },
      { to: to.testRun(gameId), label: cc.shell.testRun },
      { to: to.settings(gameId), label: cc.shell.settings },
    ],
    race: [
      { to: to.controls(gameId), label: cc.shell.controls },
      { to: to.map(gameId), label: cc.shell.map },
      { to: to.feed(gameId), label: cc.shell.feed },
      { to: to.chat(gameId), label: cc.shell.chat, badge: chatUnread },
    ],
    after: [
      { to: to.results(gameId), label: cc.shell.results },
      { to: to.recap(gameId), label: cc.shell.recap },
    ],
  };
}

// The frame around every page: which game, which phase, which page. Phases
// sit at the top, so the console says whether you're preparing a race,
// running it, or looking back on it.
export default function ConsoleLayout() {
  const { user, isAdmin } = useAuth();
  const appearance = useAppearance();
  const navigate = useNavigate();
  const location = useLocation();
  const match = useMatch('/games/:gameId/*');
  const gameId = match && match.params.gameId !== 'new' ? match.params.gameId : undefined;
  const section = location.pathname.split('/')[3];
  const phase = PHASES.find(p => p === section);
  const now = useNow(60_000);

  const games = dataOr(useMyGames(user?.uid, isAdmin), []);
  const gameLive = useGame(gameId);
  const game = dataOr(gameLive, null);
  // Loaded, and not there: deleted, or a wrong address
  const missing = !!gameId && gameLive.status === 'ready' && !gameLive.data;
  const chatUnread = useChatUnread(gameId);
  const tabs = gameId ? phaseTabs(gameId, chatUnread) : null;
  // The pages of single teams, quests, items and players belong to no phase;
  // while the race runs they keep its controls at hand all the same
  const raceBar = !!game && !game.endedAt && (phase ? phase === 'race' : phaseOf(game, now) === 'race');

  return (
    // The visible height, not the screen's: on phones the screen runs on
    // under the browser's toolbar
    <div className="flex h-[100dvh] flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-2 md:px-8">
          <Link to={to.games()} className="mr-1 text-gray-900" aria-label={cc.shell.brand}><Logo size={34} /></Link>
          <Menu label={<span className="truncate">{game?.name ?? cc.shell.allGames}</span>}>
            {close => (
              <>
                {[...games].sort((a, b) => b.startDateTime - a.startDateTime).map(g => (
                  <MenuItem key={g.id} onSelect={() => { close(); navigate(to.game(g.id)); }}>
                    <span className={g.id === gameId ? 'font-semibold' : ''}>{g.name}</span>
                  </MenuItem>
                ))}
                <div className="my-1 border-t border-gray-100" />
                <MenuItem tone="muted" onSelect={() => { close(); navigate(to.games()); }}>{cc.shell.allGames}</MenuItem>
                <MenuItem tone="muted" onSelect={() => { close(); navigate(to.newGame()); }}>+ {cc.shell.newGame}</MenuItem>
              </>
            )}
          </Menu>
          <span className="flex-1" />
          <Menu align="right" label={<span className="font-medium text-gray-600">{cc.shell.account}</span>}>
            {close => (
              <>
                <MenuItem onSelect={() => { close(); window.open('/help/hosting', '_blank', 'noreferrer'); }}>{cc.shell.hostingGuide}</MenuItem>
                <div className="my-1 border-t border-gray-100" />
                <p className="px-3 pb-1 pt-2 text-xs font-medium text-gray-400">{cc.shell.appearance}</p>
                {(['system', 'light', 'dark'] as const).map(choice => (
                  <MenuItem key={choice} onSelect={() => { close(); setAppearance(choice); }}>
                    <span className={appearance === choice ? 'font-semibold' : ''}>
                      {appearance === choice ? '✓ ' : ''}{cc.shell.appearances[choice]}
                    </span>
                  </MenuItem>
                ))}
                <div className="my-1 border-t border-gray-100" />
                {isAdmin && <MenuItem onSelect={() => { close(); navigate(to.users()); }}>{cc.shell.users}</MenuItem>}
                <MenuItem tone="muted" onSelect={() => { close(); signOut(auth); }}>{cc.shell.signOut}</MenuItem>
              </>
            )}
          </Menu>
        </div>

        {tabs && gameId && (
          <div className="px-4 md:px-8">
            <div className="pb-2">
              <PhaseTabs tabs={[
                { to: to.prepare(gameId), label: cc.shell.prepare },
                { to: to.race(gameId), label: cc.shell.race, badge: chatUnread },
                { to: to.after(gameId), label: cc.shell.after },
              ]} />
            </div>
            {phase && tabs[phase] && <SubTabs tabs={tabs[phase]} />}
          </div>
        )}
      </header>

      {raceBar && <RaceBar game={game} />}
      {gameId && <GuideBar gameId={gameId} />}

      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
        {game && <UnendedRaceNotice game={game} />}
        {game && <HeldNotice game={game} />}
        {missing ? <Empty title={copy.server.noGame} action={<LinkButton to={to.games()}>{cc.shell.allGames}</LinkButton>} /> : <Outlet />}
      </main>
    </div>
  );
}

// The race's time came with problems in it, so it didn't start; every page
// says so until the host starts it
function HeldNotice({ game }: { game: GameWithId }) {
  const now = useNow(10_000);
  const { pathname } = useLocation();
  const { issues } = useReadiness(game.id);
  if (!game.startHeld || game.endedAt || now < game.startDateTime) return null;
  const fixed = !issues.some(i => i.level === 'problem');
  return (
    <p className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="status">
      <span className="flex-1">{fixed ? cc.layout.heldFixed : cc.layout.held}</span>
      {pathname !== to.overview(game.id) && <Link to={to.overview(game.id)} className="font-medium underline">{cc.layout.heldShow}</Link>}
    </p>
  );
}

// A race nobody ended has its trails deleted 30 days after its start; its
// hosts see it coming for the last week
function UnendedRaceNotice({ game }: { game: GameWithId }) {
  const [now] = useState(() => Date.now());
  const deletion = unendedRaceNotice(game, now);
  if (!deletion) return null;
  const day = (ms: number) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: gameTimeZone(game) }).format(ms);
  return (
    <p className="mx-auto mb-6 max-w-6xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {cc.layout.unendedRace({ started: day(game.startDateTime), deletion: day(deletion) })}
    </p>
  );
}
