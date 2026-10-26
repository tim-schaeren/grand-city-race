import { useMemo } from 'react';
import { checkGame, consoleCopy as cc, type CheckIssue, type CheckTarget } from '@grandcityrace/shared';
import { useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { usePlayers } from '../data/players';
import { useQuests } from '../data/quests';
import { to } from '../shell/to';

export interface Step {
  key: string;
  title: string;
  why: string;
  done: boolean;
  to: string;
}

// Where in the console a checker finding is fixed
export function targetPath(gameId: string, target: CheckTarget): string {
  switch (target.kind) {
    case 'quest': return to.quest(gameId, target.questId);
    case 'quests': return to.quests(gameId);
    case 'settings': return to.settings(gameId);
    case 'teams': return to.teams(gameId);
    case 'invite': return `${to.overview(gameId)}#invite`;
  }
}

// How ready a game is: the checklist's steps, and what the checker finds
export function useReadiness(gameId: string | undefined): { game: GameWithId | null; missing: boolean; steps: Step[]; issues: CheckIssue[] } {
  const live = useGame(gameId);
  const game = dataOr(live, null);
  // Loaded, and not there: deleted, or a wrong address
  const missing = live.status === 'ready' && !live.data;
  const quests = useQuests(gameId);
  const players = usePlayers(gameId);
  return useMemo(() => {
    if (!game || quests.status !== 'ready' || players.status !== 'ready') return { game, missing, steps: [], issues: [] };
    const issues = checkGame({ game, quests: quests.data, players: players.data });
    const hasQuests = !issues.some(i => i.key === 'no-quests');
    const questProblem = issues.find(i => i.level === 'problem' && i.target.kind === 'quest');
    const c = cc.checklist;
    const steps: Step[] = [
      { key: 'basics', title: c.basics, why: c.basicsWhy, done: !!(game.name && game.city && game.startDateTime), to: to.settings(game.id) },
      // Written means every quest can be played: its place, text and answers are there
      { key: 'quests', title: c.quests, why: c.questsWhy, done: hasQuests && !questProblem, to: questProblem ? targetPath(game.id, questProblem.target) : to.quests(game.id) },
      // Saving the shop once, even with everything off, counts as deciding
      { key: 'shop', title: c.shop, why: c.shopWhy, done: !!game.shop, to: to.shop(game.id) },
      { key: 'test', title: c.test, why: c.testWhy, done: !!game.testedAt, to: to.testRun(game.id) },
      { key: 'invite', title: c.invite, why: c.inviteWhy, done: players.data.length > 0, to: `${to.overview(game.id)}#invite` },
    ];
    return { game, missing, steps, issues };
  }, [game, missing, quests, players]);
}
