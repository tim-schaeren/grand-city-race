import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import {
  questView,
  paths,
  copy,
  gameEconomy,
  teamCoins,
  hintsRevealedFor,
  pausedMsNow,
  questSolvedId,
  teamFinishedId,
  isTestTeam,
  type Quest,
  type QuestView,
  type Team,
} from '@grandcityrace/shared';
import { db } from './firebase';
import { fail } from './input';
import {
  readQuest,
  currentQuestId,
  arriveAt,
  progressOf,
  logActivity,
  teamRefs,
  type TeamContext,
} from './game';

export interface CurrentQuest {
  quest: Quest;
  view: QuestView;
}

// The quest the team is on, with its progress so far. An action names the
// quest it meant; if the team has moved on since, the action is refused.
export async function readCurrentQuest(
  tx: Transaction,
  ctx: TeamContext,
  now: number,
  expectedQuestId?: string,
): Promise<CurrentQuest> {
  const questId = currentQuestId(ctx.game, ctx.team, ctx.state);
  if (!questId) fail('failed-precondition', copy.server.raceOver);
  if (expectedQuestId && expectedQuestId !== questId) fail('failed-precondition', copy.server.movedOn);
  const quest = await readQuest(tx, ctx.game.id, questId);
  if (!quest) fail('failed-precondition', copy.quest.none);
  // The quest itself may have been edited since the team arrived, so the view
  // is rebuilt from it; only the team's progress carries over
  const existing = ctx.state.quest?.questId === questId ? ctx.state.quest : null;
  const view = existing
    ? questView(quest, progressOf(existing), hintsRevealedFor(ctx.state, questId))
    : arriveAt(quest, ctx.game, now);
  return { quest, view };
}

// Solving a quest, by the team or marked by a host: paid for, the next quest
// opened, and, after the last, the finish. Reads everything it needs before
// returning the function that writes, as a transaction requires.
export async function prepareSolve(tx: Transaction, ctx: TeamContext, questId: string) {
  const { game, team, state } = ctx;
  const order = game.questOrder ?? [];
  const nextId = order[order.indexOf(questId) + 1] ?? null;
  const next = nextId ? await readQuest(tx, game.id, nextId) : null;
  const teams = nextId ? null : await tx.get(db.collection(paths.teams(game.id)));
  const finishedBefore = teams
    ? teams.docs.filter(d => d.id !== team.id && !isTestTeam(d.id) && (d.data() as Team).finishedAt).length
    : 0;

  return (now: number, { byHost = false }: { byHost?: boolean } = {}) => {
    const refs = teamRefs(game.id, team.id);
    const economy = gameEconomy(game);
    // One clock for both entries: equal timestamps sort arbitrarily, and
    // finishing has to read after the solve that caused it
    tx.update(refs.state, {
      currentQuestId: nextId,
      completedQuestIds: FieldValue.arrayUnion(questId),
      // Paid as if solved when a host marks it, so a broken quest doesn't leave the team poorer
      coins: teamCoins(state, economy) + economy.coinsPerQuest,
      quest: next ? arriveAt(next, game, now) : null,
    });
    const teamUpdate: Record<string, unknown> = { solvedCount: FieldValue.increment(1) };
    if (!nextId) {
      teamUpdate.finishedAt = now;
      // Pauses after this don't count against the team's time
      teamUpdate.pausedMsAtFinish = pausedMsNow(game, now);
    }
    tx.update(refs.team, teamUpdate);

    if (!byHost) {
      logActivity(tx, game.id, {
        type: 'quest_solved',
        at: now,
        visibility: 'public',
        teamId: team.id,
        teamName: team.name,
        // No title: every team reads this entry, and a descriptive title
        // would give away a quest they haven't hunted for yet
        questId,
        questNumber: order.indexOf(questId) + 1,
      }, questSolvedId(team.id, questId));
    }
    if (!nextId) {
      logActivity(tx, game.id, {
        type: 'team_finished',
        at: now + 1,
        visibility: 'public',
        teamId: team.id,
        teamName: team.name,
        placement: finishedBefore + 1,
      }, teamFinishedId(team.id));
    }
  };
}
