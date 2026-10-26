import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  consoleCopy as cc, formatDuration, hasStarted, metersBetween, raceTimeMs, type ActivityEntry, type ChatMessage, type Quest,
} from '@grandcityrace/shared';
import { ChatThread } from '../chat/ChatThread';
import Icon from '../components/Icon';
import { FeedList } from '../feed/FeedList';
import LiveMap from './map/LiveMap';
import { useActivity } from '../data/activity';
import { useAttempts } from '../data/attempts';
import { unreadFrom, useMessages } from '../data/chat';
import { phaseOf, useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { usePlayers } from '../data/players';
import { inOrder, useQuests } from '../data/quests';
import { useTeams, type HostTeam } from '../data/teams';
import { SheetHost } from '../shell/sheet';
import { to } from '../shell/to';
import { useNow } from '../shell/useNow';
import { QuestLink, TeamDot, TeamLink } from '../ui/EntityLink';
import { Show } from '../ui/States';
import { gameTimeZone } from '../utils/zonedTime';
import { STALE_MS, teamPosition, type TeamPosition } from './positions';
import { rankTeams } from './standings';

// A team is stuck when it keeps getting turned away on the quest it's on now
const STUCK_AFTER = 3;
const FEED_SHOWN = 40;

// The width from which race control shows everything side by side
const WIDE = '(min-width: 1024px)';

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const change = () => setWide(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  return wide;
}

interface Row {
  team: HostTeam;
  rank: number;
  quest: (Quest & { number: number }) | null;
  position: TeamPosition | null;
  atTheSpot: boolean;
  wrongTries: number;
}

// The race on one screen: what needs attention, the standings, the map, the
// chat and the feed. On a laptop side by side, and whatever is opened from
// here slides in beside it; on a phone the alerts and the standings.
export default function RaceControl() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  return (
    <Show live={game}>
      {g => (g ? <Control game={g} /> : null)}
    </Show>
  );
}

function Control({ game }: { game: GameWithId }) {
  const wide = useWide();
  const now = useNow(15_000);
  const zone = gameTimeZone(game);
  const teams = dataOr(useTeams(game.id), []);
  const players = dataOr(usePlayers(game.id), []);
  const quests = inOrder(dataOr(useQuests(game.id), []), game.questOrder);
  const attempts = dataOr(useAttempts(game.id), []);
  const messages = dataOr(useMessages(game.id), [] as ChatMessage[]);
  const activity = dataOr(useActivity(game.id), [] as ActivityEntry[]);
  const [chatTeamId, setChatTeamId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ teamId: string } | null>(null);
  const navigate = useNavigate();
  const running = phaseOf(game, now) === 'race' && !game.pausedAt && hasStarted(game, now);

  const rows = useMemo<Row[]>(() => {
    return rankTeams(teams).map((team, i) => {
      const members = players.filter(p => p.teamId === team.id).map(p => ({ lastLocation: p.position }));
      const position = teamPosition(members, now);
      const questId = team.finishedAt ? null : team.currentQuestId ?? game.questOrder?.[0] ?? null;
      const quest = quests.find(q => q.id === questId) ?? null;
      const atTheSpot = !!quest?.location && !!position && !position.stale
        && metersBetween(position, quest.location) <= (quest.fenceRadius ?? 50);
      const wrongTries = quest ? attempts.filter(a => a.teamId === team.id && a.questId === quest.id).length : 0;
      return { team, rank: i + 1, quest, position, atTheSpot, wrongTries };
    });
  }, [teams, players, quests, attempts, game.questOrder, now]);

  function openChat(teamId: string) {
    if (wide) setChatTeamId(teamId);
    else navigate(`${to.chat(game.id)}?team=${teamId}`);
  }
  function showOnMap(teamId: string) {
    if (wide) setFocus({ teamId });
    else navigate(to.map(game.id), { state: { focusTeamId: teamId } });
  }

  const alerts = <Alerts rows={rows} messages={messages} running={running} now={now} onReply={openChat} />;
  const standings = <Standings rows={rows} game={game} onShow={showOnMap} />;
  const map = <LiveMap embedded focus={focus} />;
  const chat = <Inbox game={game} teams={teams} messages={messages} zone={zone} open={chatTeamId} onOpen={setChatTeamId} />;
  const feed = (
    <>
      <FeedList entries={activity.slice(0, FEED_SHOWN)} />
      <Link to={to.feed(game.id)} className="mt-3 inline-block text-sm text-gray-500 hover:text-gray-900">{cc.raceControl.wholeFeed}</Link>
    </>
  );

  return (
    <SheetHost.Provider value={true}>
      {/* Edge to edge, the full height of the page */}
      <div className="-m-4 h-[calc(100%+2rem)] md:-m-8 md:h-[calc(100%+4rem)]">
        {wide ? (
          <div className="grid h-full grid-cols-[300px_minmax(0,1fr)_380px]">
            <div className="space-y-6 overflow-y-auto border-r border-gray-200 bg-white p-4">
              <Section title={cc.raceControl.alerts}>{alerts}</Section>
              <Section title={cc.raceControl.standings}>{standings}</Section>
            </div>
            <div className="relative z-0 min-w-0">{map}</div>
            <div className="flex min-h-0 flex-col border-l border-gray-200 bg-white">
              <div className="flex min-h-0 flex-1 flex-col border-b border-gray-200">
                <h2 className="px-4 pb-2 pt-4 text-sm font-semibold text-gray-900">{cc.raceControl.chat}</h2>
                {chat}
              </div>
              <div className="h-[45%] shrink-0 overflow-y-auto p-4">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">{cc.raceControl.feed}</h2>
                {feed}
              </div>
            </div>
          </div>
        ) : (
          // On a phone the map, feed and chat are the race's other tabs
          <div className="h-full space-y-6 overflow-y-auto bg-white p-4">
            <Section title={cc.raceControl.alerts}>{alerts}</Section>
            <Section title={cc.raceControl.standings}>{standings}</Section>
          </div>
        )}
      </div>
    </SheetHost.Provider>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

// What a host should look at now: messages waiting, teams stuck on an
// answer, teams the map has lost
function Alerts({ rows, messages, running, now, onReply }: {
  rows: Row[]; messages: ChatMessage[]; running: boolean; now: number; onReply: (teamId: string) => void;
}) {
  const items: { key: string; node: ReactNode }[] = [];
  for (const { team } of rows) {
    if (unreadFrom(team, messages) === 0) continue;
    const last = messages.findLast(m => m.teamId === team.id && !m.fromHost)!;
    items.push({
      key: `chat-${team.id}`,
      node: (
        <>
          <TeamLink id={team.id} name={team.name} color={team.color} /> <span className="text-gray-600">{cc.raceControl.wrote({ text: last.text })}</span>{' '}
          <button type="button" onClick={() => onReply(team.id)} className="font-medium text-gray-900 underline">{cc.raceControl.reply}</button>
        </>
      ),
    });
  }
  for (const { team, quest, wrongTries } of rows) {
    if (!quest || wrongTries < STUCK_AFTER) continue;
    items.push({
      key: `stuck-${team.id}`,
      node: (
        <>
          <TeamLink id={team.id} name={team.name} color={team.color} />: {cc.raceControl.stuck({ n: wrongTries })}{' '}
          <QuestLink id={quest.id}>{cc.raceControl.questN({ n: quest.number })}</QuestLink>
        </>
      ),
    });
  }
  if (running) {
    for (const { team, position } of rows) {
      if (team.finishedAt || !team.memberIds?.length || (position && !position.stale)) continue;
      const minutes = position ? Math.floor((now - position.updatedAt) / 60_000) : null;
      if (minutes !== null && minutes * 60_000 < STALE_MS) continue;
      items.push({
        key: `lost-${team.id}`,
        node: (
          <>
            <TeamLink id={team.id} name={team.name} color={team.color} />:{' '}
            {minutes === null ? cc.raceControl.noPositionYet : cc.raceControl.noPositionFor({ time: cc.raceControl.minutes({ n: minutes }) })}
          </>
        ),
      });
    }
  }
  if (items.length === 0) return <p className="text-sm text-gray-400">{cc.raceControl.allQuiet}</p>;
  return (
    <ul className="space-y-2">
      {items.map(item => (
        <li key={item.key} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-gray-900">{item.node}</li>
      ))}
    </ul>
  );
}

function Standings({ rows, game, onShow }: { rows: Row[]; game: GameWithId; onShow: (teamId: string) => void }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">{cc.raceControl.noTeams}</p>;
  const total = game.questOrder?.length ?? 0;
  return (
    <ol className="divide-y divide-gray-100">
      {rows.map(({ team, rank, quest, atTheSpot }) => {
        const time = raceTimeMs(team, game);
        return (
          <li key={team.id} className="flex items-start gap-3 py-2">
            <span className={`w-5 shrink-0 pt-0.5 text-right text-sm tabular-nums ${rank <= 3 ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{rank}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm"><TeamLink id={team.id} name={team.name} color={team.color} /></span>
              <span className="block text-xs text-gray-500">
                {team.finishedAt && time !== null ? (
                  <span className="text-green-700">{cc.raceControl.finished({ time: formatDuration(time) })}</span>
                ) : quest ? (
                  <>
                    <QuestLink id={quest.id}>{cc.raceControl.onQuest({ n: quest.number, of: total })}</QuestLink>
                    {atTheSpot && <span className="text-green-700"> · {cc.raceControl.atTheSpot}</span>}
                  </>
                ) : null}
              </span>
            </span>
            <button
              type="button"
              title={cc.raceControl.showOnMap}
              aria-label={cc.raceControl.showOnMap}
              onClick={() => onShow(team.id)}
              className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
            >
              <Icon name="map-marker-outline" size={16} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// Every team's thread with the hosts: the list, newest first, or one thread open
function Inbox({ game, teams, messages, zone, open, onOpen }: {
  game: GameWithId; teams: HostTeam[]; messages: ChatMessage[]; zone: string; open: string | null; onOpen: (teamId: string | null) => void;
}) {
  const team = teams.find(t => t.id === open);
  if (team) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 pb-2 text-sm">
          <button type="button" onClick={() => onOpen(null)} className="text-gray-500 hover:text-gray-900">{cc.raceControl.allThreads}</button>
          <TeamLink id={team.id} name={team.name} color={team.color} />
        </div>
        <ChatThread gameId={game.id} team={team} messages={messages.filter(m => m.teamId === team.id)} zone={zone} />
      </div>
    );
  }
  const threads = teams
    .map(t => ({ team: t, last: messages.findLast(m => m.teamId === t.id), unread: unreadFrom(t, messages) }))
    .sort((a, b) => b.unread - a.unread || (b.last?.sentAt ?? 0) - (a.last?.sentAt ?? 0));
  return (
    <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
      {threads.map(({ team: t, last, unread }) => (
        <li key={t.id}>
          <button type="button" onClick={() => onOpen(t.id)} className="w-full px-4 py-2 text-left hover:bg-gray-50">
            <span className="flex items-center gap-2">
              <TeamDot color={t.color} />
              <span className="flex-1 truncate text-sm font-medium text-gray-900">{t.name}</span>
              {unread > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">{unread}</span>}
            </span>
            <span className="mt-0.5 block truncate text-xs text-gray-400">
              {last ? `${last.fromHost ? cc.raceControl.you : ''}${last.text}` : cc.raceControl.noMessages}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
