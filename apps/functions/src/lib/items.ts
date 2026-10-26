import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import {
  copy,
  teamCoins,
  robberyTake,
  SHOP_ITEMS_BY_TYPE,
  type Economy,
  type ShopItemConfig,
  type Team,
  type TeamState,
} from '@grandcityrace/shared';
import { logActivity, teamRefs } from './game';
import { pushToPlayers } from './push';

export type OnAnotherTeam = 'curse' | 'robbery' | 'donate';

// One team using an item on another, once everything has been checked: the
// buyer pays, a shield stops an attack, the effect lands, and it's recorded.
// A team in the race does it from its phone; the test rival from the console.
export function applyItem(tx: Transaction, { gameId, item, config, economy, buyer, buyerCoins, target: targetTeam, targetState, gift, now }: {
  gameId: string;
  item: OnAnotherTeam;
  config: ShopItemConfig;
  economy: Economy;
  buyer: Team;
  buyerCoins: number;
  target: Team;
  targetState: TeamState;
  gift: number;
  now: number;
}) {
  const definition = SHOP_ITEMS_BY_TYPE[item];
  const cost = config.price + gift;
  const target = teamRefs(gameId, targetTeam.id);
  const buyerState = teamRefs(gameId, buyer.id).state;
  const entry = {
    at: now,
    visibility: 'public' as const,
    teamId: buyer.id,
    teamName: buyer.name,
    targetTeamId: targetTeam.id,
    targetTeamName: targetTeam.name,
    itemType: item,
  };
  const base = { buyerName: buyer.name, targetName: targetTeam.name, memberIds: targetTeam.memberIds ?? [] };

  // A shield stops an attack and is used up; the attacker has still paid
  if (definition.isAttack && (targetState.shields ?? 0) > 0) {
    tx.update(buyerState, { coins: buyerCoins - config.price });
    tx.update(target.state, { shields: FieldValue.increment(-1) });
    logActivity(tx, gameId, { ...entry, type: 'attack_blocked' });
    return { ...base, outcome: 'blocked' as const, amount: null, minutes: null };
  }
  if (item === 'curse') {
    tx.update(buyerState, { coins: buyerCoins - config.price });
    tx.update(target.state, { cursedUntil: now + config.durationMinutes * 60000, cursedByName: buyer.name });
    logActivity(tx, gameId, { ...entry, type: 'team_cursed', durationMinutes: config.durationMinutes });
    return { ...base, outcome: 'cursed' as const, amount: null, minutes: config.durationMinutes };
  }
  if (item === 'robbery') {
    const targetCoins = teamCoins(targetState, economy);
    const taken = robberyTake(targetCoins, config);
    tx.update(buyerState, { coins: buyerCoins - config.price + taken });
    tx.update(target.state, { coins: targetCoins - taken, robbedAt: now });
    logActivity(tx, gameId, { ...entry, type: 'team_robbed', amount: taken });
    return { ...base, outcome: 'robbed' as const, amount: taken, minutes: null };
  }
  tx.update(buyerState, { coins: buyerCoins - cost });
  tx.update(target.state, { coins: teamCoins(targetState, economy) + gift });
  logActivity(tx, gameId, { ...entry, type: 'coins_donated', amount: gift });
  return { ...base, outcome: 'donated' as const, amount: gift, minutes: null };
}

// The team on the receiving end hears about it straight away
export async function pushOutcome(item: OnAnotherTeam, result: ReturnType<typeof applyItem>) {
  const n = result.amount ?? 0;
  const [title, body] = {
    blocked: () => copy.server.pushBlocked(result.buyerName, item),
    cursed: () => copy.server.pushCursed(result.buyerName, result.minutes ?? 0),
    robbed: () => copy.server.pushRobbed(result.buyerName, n),
    donated: () => copy.server.pushDonated(result.buyerName, n),
  }[result.outcome]();
  await pushToPlayers(result.memberIds, title, body);
}
