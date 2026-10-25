import {
	doc,
	collection,
	addDoc,
	deleteDoc,
	updateDoc,
	arrayUnion,
	writeBatch,
} from 'firebase/firestore';
import {
	copy,
	questSolvedId,
	teamFinishedId,
	hintRevealedId,
	type Economy,
	type Game,
	type Quest,
	type ShopConfig,
	type ShopItemType,
	type Team,
} from '@grandcityrace/shared';
import { db } from '../../firebase';
import { callApi } from '../../utils/api';
import { removePrivateEntry } from '../../utils/privateEntry';

// Everything a team does to the game, in one place. Most of it is written
// straight from the phone, from the local snapshot rather than in
// transactions, so it still queues while offline.

export function completeQuest(
	team: Team,
	game: Game,
	completed: Quest,
	coins: number,
	economy: Economy,
	finishedTeams: number,
) {
	const nextQuestId =
		game.questOrder[game.questOrder.indexOf(completed.id) + 1] ?? null;
	// One clock for both entries: equal timestamps sort arbitrarily, and
	// finishing has to read after the solve that caused it
	const at = Date.now();
	const update: Record<string, unknown> = {
		completedQuestIds: arrayUnion(completed.id),
		currentQuestId: nextQuestId,
		questProgress: null,
		coins: coins + economy.coinsPerQuest,
	};
	if (!nextQuestId) {
		update.finishedAt = at;
		// Pauses after this don't count against the team's time
		update.pausedMsAtFinish = game.totalPausedMs ?? 0;
	}

	// Progress and its board entry land together, or not at all. The entry ids are
	// derived from the quest, so two teammates solving at once write one entry.
	const batch = writeBatch(db);
	batch.update(doc(db, 'teams', team.id), update);
	batch.set(
		doc(db, 'games', game.id, 'activity', questSolvedId(team.id, completed.id)),
		{
			type: 'quest_solved',
			at,
			visibility: 'public',
			teamId: team.id,
			teamName: team.name,
			// No title: every team reads this entry, and a descriptive title
			// would give away a quest they haven't hunted for yet
			questNumber: game.questOrder.indexOf(completed.id) + 1,
		},
	);
	if (!nextQuestId) {
		batch.set(doc(db, 'games', game.id, 'activity', teamFinishedId(team.id)), {
			type: 'team_finished',
			at: at + 1,
			visibility: 'public',
			teamId: team.id,
			teamName: team.name,
			placement: finishedTeams + 1,
		});
	}
	return batch.commit();
}

// Recorded for the hosts, who can widen the answer list mid-race
export function recordWrongAnswer(team: Team, game: Game, quest: Quest, text: string) {
	return addDoc(collection(db, 'games', game.id, 'attempts'), {
		questId: quest.id,
		teamId: team.id,
		teamName: team.name,
		text,
		at: Date.now(),
	});
}

// Absolute balances rather than increments: two teammates writing at once land on the
// same number instead of paying twice, and it still works offline.
export function revealHint(
	team: Team,
	game: Game,
	quest: Quest,
	revealed: number,
	coins: number,
	economy: Economy,
) {
	const batch = writeBatch(db);
	batch.update(doc(db, 'teams', team.id), {
		coins: coins - economy.hintCost,
		hintsRevealed: { ...(team.hintsRevealed ?? {}), [quest.id]: revealed + 1 },
	});
	// Only this team sees what it spends money on
	batch.set(
		doc(db, 'games', game.id, 'activity', hintRevealedId(team.id, quest.id, revealed + 1)),
		{
			type: 'hint_revealed',
			at: Date.now(),
			visibility: 'team',
			teamId: team.id,
			teamName: team.name,
			questTitle: quest.title,
			amount: economy.hintCost,
		},
	);
	return batch.commit();
}

// Items for your own team are written here, like hints: offline-friendly,
// and private to the team, so rivals don't see what you buy
export function buyForTeam(
	team: Team,
	game: Game,
	type: ShopItemType,
	shop: ShopConfig,
	coins: number,
) {
	const price = shop[type].price;
	const at = Date.now();
	const until = at + shop[type].durationMinutes * 60000;
	const change: Record<string, unknown> = { coins: coins - price };
	if (type === 'compass') change.activeCompassUntil = until;
	if (type === 'radar') change.activeRadarUntil = until;
	if (type === 'shield') change.shields = (team.shields ?? 0) + 1;
	const batch = writeBatch(db);
	batch.update(doc(db, 'teams', team.id), change);
	batch.set(doc(db, 'games', game.id, 'activity', `${team.id}_${type}_${at}`), {
		type: 'item_bought',
		at,
		visibility: 'team',
		teamId: team.id,
		teamName: team.name,
		itemType: type,
		itemName: copy.items[type].bought,
		amount: price,
	});
	return batch.commit();
}

// Items used on another team go through the server, which may change a
// team other than your own. Resolves to what happened, in words.
export async function applyItemTo(
	game: Game,
	type: ShopItemType,
	targetTeamId: string,
	shop: ShopConfig,
	amount?: number,
): Promise<string> {
	const res = await callApi<{
		outcome: 'cursed' | 'robbed' | 'blocked' | 'donated';
		targetTeamName: string;
		amount: number | null;
	}>('/api/use-item', { gameId: game.id, item: type, targetTeamId, amount });
	const n = res.amount ?? 0;
	const target = res.targetTeamName;
	return {
		cursed: copy.shop.cursed(target, shop.curse.durationMinutes),
		robbed: copy.shop.robbed(n, target),
		blocked: copy.shop.blocked(target),
		donated: copy.shop.donated(n, target),
	}[res.outcome];
}

export function sendMessage(team: Team, game: Game, authorId: string, authorName: string, text: string) {
	return addDoc(collection(db, 'games', game.id, 'messages'), {
		teamId: team.id,
		authorId,
		authorName,
		fromHost: false,
		text,
		sentAt: Date.now(),
	});
}

// Leaving takes this player out of the team but leaves the team's progress
// alone — it belongs to the team, not to any one member
export async function leaveGame(team: Team, game: Game | null, uid: string) {
	await updateDoc(doc(db, 'teams', team.id), {
		memberIds: (team.memberIds ?? []).filter((id) => id !== uid),
	});
	await updateDoc(doc(db, 'users', uid), { teamId: null, gameId: null });
	if (game) {
		await deleteDoc(doc(db, 'games', game.id, 'players', uid)).catch(() => {});
		await removePrivateEntry(game.id, uid).catch(() => {});
	}
}
