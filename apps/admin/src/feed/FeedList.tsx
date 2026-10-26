import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  consoleCopy as cc, formatActivity, formatActivityTime,
  type ActivityEntry, type Quest,
} from '@grandcityrace/shared';
import Icon from '../components/Icon';
import { useGame } from '../data/games';
import { dataOr } from '../data/live';
import { useQuests } from '../data/quests';
import { ItemLink, QuestLink, TeamLink } from '../ui/EntityLink';
import { gameTimeZone } from '../utils/zonedTime';
import { entryItems, entryQuest } from './mentions';

// A piece of a sentence that becomes a link
type Mention = { text: string | undefined; node: ReactNode };

// Turns the mentions in a sentence into links, each at its first free
// occurrence; earlier mentions claim their words first
function linkify(text: string, mentions: Mention[]): ReactNode[] {
  const claimed: { start: number; end: number; node: ReactNode }[] = [];
  for (const { text: needle, node } of mentions) {
    if (!needle) continue;
    for (let from = 0; ;) {
      const start = text.indexOf(needle, from);
      if (start < 0) break;
      const end = start + needle.length;
      if (claimed.some(c => start < c.end && end > c.start)) {
        from = start + 1;
        continue;
      }
      claimed.push({ start, end, node });
      break;
    }
  }
  claimed.sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let at = 0;
  claimed.forEach((c, i) => {
    if (c.start > at) parts.push(text.slice(at, c.start));
    parts.push(<Fragment key={i}>{c.node}</Fragment>);
    at = c.end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return parts;
}

function FeedText({ entry, quests, order }: { entry: ActivityEntry; quests: Quest[]; order: string[] }) {
  const { text } = formatActivity(entry);
  const quest = entryQuest(entry, quests, order);
  return (
    <>
      {linkify(text, [
        { text: entry.teamId ? entry.teamName ?? undefined : undefined, node: <TeamLink id={entry.teamId!} name={entry.teamName} /> },
        { text: entry.targetTeamId ? entry.targetTeamName : undefined, node: <TeamLink id={entry.targetTeamId!} name={entry.targetTeamName} /> },
        { text: quest?.text, node: quest && <QuestLink id={quest.id}>{quest.text}</QuestLink> },
        ...entryItems(entry).map(({ type, word }) => ({ text: word, node: <ItemLink type={type}>{word}</ItemLink> })),
      ])}
    </>
  );
}

// Days by the game's own clock
function byDay(entries: ActivityEntry[], zone: string) {
  const groups: { day: string; entries: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const day = new Date(entry.at).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', timeZone: zone });
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}

// The feed, newest first, grouped by day, with every team, quest and item in
// it linked to its page
export function FeedList({ entries, empty = cc.activityPage.nothingHasHappenedYet }: { entries: ActivityEntry[]; empty?: ReactNode }) {
  const { gameId } = useParams();
  const game = dataOr(useGame(gameId), null);
  const quests = dataOr(useQuests(gameId), []);
  const zone = gameTimeZone(game);
  const order = game?.questOrder ?? [];

  if (entries.length === 0) return <p className="text-sm text-gray-400">{empty}</p>;
  return (
    <div className="space-y-6">
      {byDay(entries, zone).map(group => (
        <div key={group.day}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.day}</p>
          <div className="space-y-1">
            {group.entries.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
                <Icon name={formatActivity(entry).icon} size={18} className="text-gray-500" />
                <span className="flex-1 text-sm text-gray-900">
                  <FeedText entry={entry} quests={quests} order={order} />
                </span>
                {entry.visibility === 'team' && (
                  <span className="shrink-0 text-xs text-gray-300" title={cc.activityPage.onlyThisTeamCanSee}>{cc.activityPage.private}</span>
                )}
                {entry.visibility === 'hosts' && (
                  <span className="shrink-0 text-xs text-gray-300" title={cc.activityPage.onlyHostsCanSee}>{cc.activityPage.hostsOnly}</span>
                )}
                <span className="shrink-0 text-xs tabular-nums text-gray-400">{formatActivityTime(entry.at, zone)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
