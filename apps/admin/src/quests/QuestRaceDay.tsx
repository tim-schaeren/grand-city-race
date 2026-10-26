import { useMemo } from 'react';
import { consoleCopy as cc, hasStarted, type Quest } from '@grandcityrace/shared';
import { FenceMap } from '../components/FenceMap';
import { FeedList } from '../feed/FeedList';
import { entryQuest } from '../feed/mentions';
import { useActivity } from '../data/activity';
import { useAttempts } from '../data/attempts';
import type { GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import type { HostTeam } from '../data/teams';
import { ago, clock } from '../entities/time';
import { useNow } from '../shell/useNow';
import { TeamLink } from '../ui/EntityLink';
import { Panel } from '../ui/Panel';
import { gameTimeZone } from '../utils/zonedTime';

// A quest on race day: who's on it, who solved it, the wrong answers typed,
// and its feed
export function QuestRaceDay({ game, quest, quests, teams }: { game: GameWithId; quest: Quest; quests: Quest[]; teams: HostTeam[] }) {
  const now = useNow(15_000);
  const zone = gameTimeZone(game);
  const activity = dataOr(useActivity(game.id), []);
  const attempts = dataOr(useAttempts(game.id), []).filter(a => a.questId === quest.id);

  const feed = useMemo(
    () => activity.filter(e => entryQuest(e, quests, game.questOrder ?? [])?.id === quest.id),
    [activity, quests, game.questOrder, quest.id],
  );
  const onIt = teams.filter(t => t.currentQuestId === quest.id && !t.finishedAt);
  const solvedBy = teams
    .filter(t => t.completedQuestIds?.includes(quest.id))
    .map(t => ({ team: t, at: feed.find(e => e.teamId === t.id && (e.type === 'quest_solved' || e.type === 'admin_marked_solved'))?.at }))
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));

  // The same wrong answer from several teams counts once, with who typed it
  const wrong = useMemo(() => {
    const byText = new Map<string, { text: string; count: number; teamIds: Set<string>; names: Map<string, string> }>();
    for (const a of attempts) {
      const key = a.text.toLowerCase();
      const row = byText.get(key) ?? { text: a.text, count: 0, teamIds: new Set(), names: new Map() };
      row.count += 1;
      row.teamIds.add(a.teamId);
      row.names.set(a.teamId, a.teamName);
      byText.set(key, row);
    }
    return [...byText.values()].sort((a, b) => b.count - a.count);
  }, [attempts]);

  const raceBegun = hasStarted(game, now) || !!game.endedAt;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
          {raceBegun && (
            <Panel title={cc.questPage.raceDay}>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">{cc.questPage.onItNow}</h3>
              {onIt.length === 0 ? (
                <p className="mb-4 text-sm text-gray-400">{cc.questPage.nobodyOnIt}</p>
              ) : (
                <ul className="mb-4 space-y-1.5">
                  {onIt.map(t => (
                    <li key={t.id} className="flex items-baseline justify-between gap-2 text-sm">
                      <TeamLink id={t.id} name={t.name} color={t.color} />
                      <span className="text-xs text-gray-400">
                        {t.quest?.unlockedAt ? cc.questPage.unlocked({ ago: ago(t.quest.unlockedAt, now) }) : cc.questPage.onTheWay}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">{cc.questPage.solvedBy}</h3>
              {solvedBy.length === 0 ? (
                <p className="text-sm text-gray-400">{cc.questPage.nobodySolved}</p>
              ) : (
                <ul className="space-y-1.5">
                  {solvedBy.map(({ team, at }) => (
                    <li key={team.id} className="flex items-baseline justify-between gap-2 text-sm">
                      <TeamLink id={team.id} name={team.name} color={team.color} />
                      {at && <span className="text-xs tabular-nums text-gray-400">{clock(at, zone)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {quest.task === 'answer' && (
            <Panel title={cc.questPage.wrongAnswers}>
              {wrong.length === 0 ? (
                <p className="text-sm text-gray-400">{cc.questPage.noWrongAnswers}</p>
              ) : (
                <ul className="space-y-2">
                  {wrong.map(row => (
                    <li key={row.text} className="text-sm">
                      <span className="font-mono">{row.text}</span>
                      <span className="ml-2 text-xs text-gray-400">{cc.questPage.timesBy({ n: row.count })}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                        {[...row.teamIds].map(id => {
                          const team = teams.find(t => t.id === id);
                          return <TeamLink key={id} id={id} name={team?.name ?? row.names.get(id)} color={team?.color} />;
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel title={cc.entities.feed}>
            <FeedList entries={feed} empty={cc.entities.feedEmpty} />
          </Panel>
      </div>
      <div className="space-y-6">
          {quest.trigger !== 'none' && (
            <Panel
              title={quest.trigger === 'location' ? cc.questPage.unlocksWhere : cc.questPage.unlocksWhen}
              description={quest.trigger === 'location'
                ? cc.questPage.place({ radius: quest.fenceRadius ?? 0 })
                : cc.questPage.distance({ meters: quest.distanceMeters ?? 0 })}
            >
              {quest.trigger === 'location' && quest.location && (
                <FenceMap location={quest.location} radius={quest.fenceRadius ?? 0} />
              )}
            </Panel>
          )}
      </div>
    </div>
  );
}
