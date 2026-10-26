import { consoleCopy } from './copy';
import { gameEconomy } from './economy';
import { metersBetween } from './geo';
import { hasContent } from './quests';
import type { Game, GamePlayer, Quest } from './types';

// The game checker: what would go wrong in a race as it's set up now, found
// while the host edits, each with where to fix it. Problems break a race;
// warnings are worth a look; notes are just so the host knows.

export type CheckLevel = 'problem' | 'warning' | 'note';

export type CheckTarget =
  | { kind: 'quest'; questId: string }
  | { kind: 'quests' }
  | { kind: 'settings' }
  | { kind: 'teams' }
  | { kind: 'invite' };

export interface CheckIssue {
  key: string;
  level: CheckLevel;
  text: string;
  target: CheckTarget;
}

// Fences smaller than this are hard to stand in: phones' positions can be off by more
export const SMALL_FENCE_M = 20;

export function checkGame({ game, quests, players }: {
  game: Pick<Game, 'questOrder' | 'startingCoins' | 'coinsPerQuest' | 'hintCost'>;
  quests: Quest[];
  players: Pick<GamePlayer, 'teamId'>[];
}): CheckIssue[] {
  const c = consoleCopy.checker;
  const issues: CheckIssue[] = [];
  const byId = new Map(quests.map(q => [q.id, q]));
  const order = (game.questOrder ?? []).filter(id => byId.has(id));
  // The quests teams will play, with their numbers in the race
  const played = order.map((id, i) => ({ quest: byId.get(id)!, n: i + 1 })).filter(({ quest }) => quest.isActive);
  const economy = gameEconomy(game);

  if (played.length === 0) {
    issues.push({ key: 'no-quests', level: 'problem', text: c.noQuests, target: { kind: 'quests' } });
  }

  for (const { quest, n } of played) {
    const at = { kind: 'quest' as const, questId: quest.id };
    const add = (key: string, level: CheckLevel, text: string) => issues.push({ key: `${key}-${quest.id}`, level, text, target: at });
    if (!hasContent(quest.description)) add('no-text', 'problem', c.noText({ n }));
    if (quest.trigger === 'location') {
      if (!quest.location) add('no-place', 'problem', c.noPlace({ n }));
      if (!hasContent(quest.navigationHint)) add('no-hint', 'problem', c.noNavigationHint({ n }));
      if ((quest.fenceRadius ?? 50) < SMALL_FENCE_M) add('small-fence', 'warning', c.smallFence({ n, m: quest.fenceRadius ?? 0 }));
    }
    if (quest.trigger === 'distance' && !(quest.distanceMeters! > 0)) add('no-distance', 'problem', c.noDistance({ n }));
    if (quest.task === 'answer' && !(quest.answers?.length)) add('no-answers', 'problem', c.noAnswers({ n }));
    if (quest.task === 'timer' && !(quest.durationSeconds! > 0)) add('no-timer', 'problem', c.noTimer({ n }));
    // A team reaching this quest has its starting coins and those of every quest before
    const coinsBy = economy.startingCoins + economy.coinsPerQuest * (n - 1);
    if ((quest.hints?.length ?? 0) > 0 && economy.hintCost > coinsBy) {
      add('hint-unaffordable', 'warning', c.hintUnaffordable({ n, coins: coinsBy, cost: economy.hintCost }));
    }
  }

  // A place inside the fence of the one before unlocks as soon as that quest is
  // solved, so its navigation hint goes unread. Fine for two quests at one
  // spot, so it's only noted.
  for (let i = 1; i < played.length; i++) {
    const a = played[i - 1];
    const b = played[i];
    if (a.quest.trigger !== 'location' || b.quest.trigger !== 'location' || !a.quest.location || !b.quest.location) continue;
    if (metersBetween(a.quest.location, b.quest.location) < (a.quest.fenceRadius ?? 50) + (b.quest.fenceRadius ?? 50)) {
      issues.push({ key: `overlap-${b.quest.id}`, level: 'note', text: c.fencesOverlap({ a: a.n, b: b.n }), target: { kind: 'quest', questId: b.quest.id } });
    }
  }

  const unordered = quests.filter(q => !order.includes(q.id));
  if (unordered.length) {
    issues.push({ key: 'unordered', level: 'warning', text: c.notInOrder({ n: unordered.length }), target: { kind: 'quests' } });
  }
  const skipped = order.length - played.length;
  if (skipped > 0) issues.push({ key: 'skipped', level: 'note', text: c.skipped({ n: skipped }), target: { kind: 'quests' } });

  if (players.length === 0) {
    issues.push({ key: 'no-players', level: 'note', text: c.noPlayers, target: { kind: 'invite' } });
  } else {
    const teamless = players.filter(p => !p.teamId).length;
    if (teamless) issues.push({ key: 'teamless', level: 'note', text: c.teamless({ n: teamless }), target: { kind: 'teams' } });
  }

  const rank: Record<CheckLevel, number> = { problem: 0, warning: 1, note: 2 };
  return issues.sort((x, y) => rank[x.level] - rank[y.level]);
}
