import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  consoleCopy as cc, compassMsLeft, curseMsLeft, formatDuration, gameEconomy, hintsRevealedFor,
  radarMsLeft, raceTimeMs, teamCoins, type ChatMessage, type Quest,
} from '@grandcityrace/shared';
import { ChatThread } from '../chat/ChatThread';
import CoinAdjustModal from '../components/CoinAdjustModal';
import TeamProgressModal from '../components/TeamProgressModal';
import { FeedList } from '../feed/FeedList';
import { useActivity } from '../data/activity';
import { useAttempts } from '../data/attempts';
import { useMessages } from '../data/chat';
import { useCoinLedger } from '../data/coins';
import { useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { usePlayers } from '../data/players';
import { inOrder, useQuests } from '../data/quests';
import { useTeams, type HostTeam } from '../data/teams';
import { useNow } from '../shell/useNow';
import { to } from '../shell/to';
import { Button } from '../ui/Button';
import { ItemLink, PlayerLink, QuestLink, TeamDot } from '../ui/EntityLink';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { Empty, Show } from '../ui/States';
import { host } from '../utils/api';
import { gameTimeZone } from '../utils/zonedTime';
import { BackLink } from './BackLink';
import { ago, clock } from './time';

// Everything about one team: where it is in the race, its players, coins,
// items, chat and feed, and the fixes a host makes mid-race
export default function TeamPage() {
  const { gameId, teamId } = useParams();
  const game = useGame(gameId);
  const teams = useTeams(gameId);
  return (
    <div>
      <BackLink fallback={to.teams(gameId!)} />
      <Show live={teams}>
        {list => {
          const team = list.find(t => t.id === teamId);
          const g = dataOr(game, null);
          if (!team) return <Empty title={cc.entities.notFound} />;
          if (!g) return null;
          return <TeamDetails game={g} team={team} />;
        }}
      </Show>
    </div>
  );
}

function TeamDetails({ game, team }: { game: GameWithId; team: HostTeam }) {
  const navigate = useNavigate();
  const now = useNow(15_000);
  const zone = gameTimeZone(game);
  const economy = gameEconomy(game);
  const quests = dataOr(useQuests(game.id), [] as Quest[]);
  const ordered = inOrder(quests, game.questOrder);
  const players = dataOr(usePlayers(game.id), []).filter(p => p.teamId === team.id);
  const activity = dataOr(useActivity(game.id), []);
  const attempts = dataOr(useAttempts(game.id), []).filter(a => a.teamId === team.id);
  const messages = dataOr(useMessages(game.id), [] as ChatMessage[]).filter(m => m.teamId === team.id);
  const ledger = useCoinLedger(game.id, team.id);
  const [dialog, setDialog] = useState<'coins' | 'progress' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const feed = useMemo(
    () => activity.filter(e => e.teamId === team.id || e.targetTeamId === team.id),
    [activity, team.id],
  );
  // When each quest was solved, from the feed
  const solvedAt = useMemo(() => {
    const at: Record<string, number> = {};
    for (const e of feed) {
      if ((e.type === 'quest_solved' || e.type === 'admin_marked_solved') && e.teamId === team.id && e.questId) at[e.questId] ??= e.at;
    }
    return at;
  }, [feed, team.id]);

  const completed = new Set(team.completedQuestIds ?? []);
  const current = ordered.find(q => q.id === team.currentQuestId);
  const finishedIn = raceTimeMs(team, game);
  const status = team.finishedAt && finishedIn !== null
    ? cc.teamPage.finished({ time: formatDuration(finishedIn) })
    : current
      ? cc.teamPage.onQuest({ n: current.number, of: ordered.length })
      : cc.teamPage.notStarted;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Page
      wide
      title={<span className="inline-flex items-center gap-3"><TeamDot color={team.color} size={16} />{team.name}</span>}
      description={status}
      actions={
        <>
          <Button onClick={() => setDialog('coins')}>{cc.teamPage.adjustCoins}</Button>
          <Button onClick={() => setDialog('progress')}>{cc.teamPage.fixProgress}</Button>
          <Button onClick={() => navigate(to.map(game.id), { state: { focusTeamId: team.id } })}>{cc.entities.showOnMap}</Button>
        </>
      }
    >
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel title={cc.teamPage.quests}>
            <ol className="space-y-1.5">
              {ordered.map(q => {
                const hints = hintsRevealedFor(team, q.id);
                const isCurrent = q.id === current?.id && !team.finishedAt;
                return (
                  <li key={q.id} className="flex items-baseline gap-2 text-sm">
                    <span className="w-5 shrink-0 text-right text-xs text-gray-400">{q.number}</span>
                    <span className={`min-w-0 flex-1 truncate ${completed.has(q.id) || isCurrent ? '' : 'opacity-50'}`}>
                      <QuestLink id={q.id}>{q.title}</QuestLink>
                    </span>
                    {hints > 0 && <span className="shrink-0 text-xs text-gray-400">{cc.teamPage.hints({ n: hints })}</span>}
                    {completed.has(q.id) && (
                      <span className="shrink-0 text-xs text-green-700">
                        {solvedAt[q.id] ? cc.teamPage.solvedAt({ time: clock(solvedAt[q.id], zone) }) : '✓'}
                      </span>
                    )}
                    {isCurrent && <span className="shrink-0 text-xs font-semibold text-gray-900">{cc.teamPage.current}</span>}
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel title={cc.teamPage.members}>
            {players.length === 0 ? (
              <p className="text-sm text-gray-400">{cc.teamPage.noMembers}</p>
            ) : (
              <ul className="space-y-1.5">
                {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                  <li key={p.uid} className="flex items-baseline justify-between gap-2 text-sm">
                    <PlayerLink uid={p.uid} name={p.name} />
                    <span className="text-xs text-gray-400">{p.position ? ago(p.position.updatedAt, now) : cc.teamPage.noPosition}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={cc.teamPage.coins} description={cc.teamPage.coinsNow({ n: teamCoins(team, economy) })}>
            <Show live={ledger} isEmpty={l => l.length === 0} empty={<p className="text-sm text-gray-400">{cc.teamPage.noAdjustments}</p>}>
              {entries => (
                <ul className="space-y-2">
                  {entries.map(e => (
                    <li key={e.id} className="flex items-baseline gap-3 text-sm">
                      <span className={`w-12 shrink-0 text-right font-semibold tabular-nums ${e.delta < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {e.delta > 0 ? `+${e.delta}` : e.delta}
                      </span>
                      <span className="min-w-0 flex-1">
                        {e.reason}
                        <span className="block text-xs text-gray-400">{cc.teamPage.adjustedBy({ name: e.byName, time: clock(e.at, zone) })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Show>
          </Panel>

          <Panel title={cc.teamPage.running}>
            <RunningItems team={team} now={now} zone={zone} />
          </Panel>

          <Panel title={cc.teamPage.wrongAnswers}>
            {attempts.length === 0 ? (
              <p className="text-sm text-gray-400">{cc.teamPage.noWrongAnswers}</p>
            ) : (
              <ul className="space-y-1.5">
                {attempts.map(a => (
                  <li key={a.id} className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-mono">{a.text}</span>
                      <span className="text-gray-400"> · </span>
                      <QuestLink id={a.questId}>{quests.find(q => q.id === a.questId)?.title ?? '—'}</QuestLink>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-gray-400">{clock(a.at, zone)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={cc.teamPage.chat}>
            <div className="-mx-5 -mb-5 flex h-80 flex-col border-t border-gray-200">
              <ChatThread gameId={game.id} team={team} messages={messages} zone={zone} />
            </div>
          </Panel>

          <Panel title={cc.entities.feed}>
            <FeedList entries={feed} empty={cc.entities.feedEmpty} />
          </Panel>
        </div>
      </div>

      {dialog === 'coins' && (
        <CoinAdjustModal
          teamName={team.name}
          balance={teamCoins(team, economy)}
          onSave={async (delta: number, reason: string) => {
            await host('adjustCoins', { gameId: game.id, teamId: team.id, delta, reason });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'progress' && (
        <TeamProgressModal
          team={team}
          game={game}
          quests={Object.fromEntries(quests.map(q => [q.id, q]))}
          onApply={(action: { type: string; questId?: string }) =>
            run(() => host('teamProgress', { gameId: game.id, teamId: team.id, type: action.type, questId: action.questId }))}
          onClose={() => setDialog(null)}
        />
      )}
    </Page>
  );
}

// Items the team has running, its shields, and a curse on it
function RunningItems({ team, now, zone }: { team: HostTeam; now: number; zone: string }) {
  const until = (ms: number) => cc.entities.until({ time: clock(now + ms, zone) });
  const rows = [
    compassMsLeft(team, now) > 0 && <><ItemLink type="compass" /> {until(compassMsLeft(team, now))}</>,
    radarMsLeft(team, now) > 0 && <><ItemLink type="radar" /> {until(radarMsLeft(team, now))}</>,
    (team.shields ?? 0) > 0 && <><ItemLink type="shield" /> {cc.teamPage.shields({ n: team.shields! })}</>,
    curseMsLeft(team, now) > 0 && (
      <><ItemLink type="curse" /> {team.cursedByName ? cc.teamPage.cursedBy({ name: team.cursedByName }) : ''} {until(curseMsLeft(team, now))}</>
    ),
  ].filter(Boolean);
  if (rows.length === 0) return <p className="text-sm text-gray-400">{cc.teamPage.nothingRunning}</p>;
  return <ul className="space-y-1.5 text-sm">{rows.map((row, i) => <li key={i}>{row}</li>)}</ul>;
}
