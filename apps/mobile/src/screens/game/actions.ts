import { addDoc, collection } from 'firebase/firestore';
import { copy, paths, type ShopConfig, type ShopItemType } from '@grandcityrace/shared';
import { db } from '../../firebase';
import { play } from '../../utils/api';

// Everything a team does to the race, in one place. The server checks each
// action and writes the result, which then arrives in the team's documents.
// Without a connection an action fails with a sentence to show; what the
// player tapped carries a retry key, so trying again can't do it twice.

type Coords = { lat: number; lng: number } | null;

// Sets the phone's clock by the server's, and puts the team on its quest once
// the race runs
export function sync(gameId: string) {
	return play('sync', { gameId });
}

// Inside a quest's fence: the server checks the position and opens the quest
export function unlock(gameId: string, questId: string, at: { lat: number; lng: number }) {
	return play('unlock', { gameId, questId, lat: at.lat, lng: at.lng });
}

export function reportDistance(gameId: string, questId: string, meters: number) {
	return play('reportDistance', { gameId, questId, meters: Math.round(meters) });
}

// An answer at a place carries the position, since it must be given there
export function answer(gameId: string, questId: string, text: string, at: Coords) {
	return play<{ correct: boolean }>(
		'answer',
		{ gameId, questId, text, ...(at ? { lat: at.lat, lng: at.lng } : {}) },
		`answer:${questId}:${text}`,
	);
}

export function continueQuest(gameId: string, questId: string) {
	return play('continueQuest', { gameId, questId }, `continue:${questId}`);
}

// Names the hint it pays for, so a retry or a teammate's tap pays once
export function revealHint(gameId: string, questId: string, index: number) {
	return play('revealHint', { gameId, questId, index }, `hint:${questId}:${index}`);
}

// Items for the team's own use
export function buyItem(gameId: string, item: ShopItemType) {
	return play('buyItem', { gameId, item }, `buy:${item}`);
}

// Items used on another team. Resolves to what happened, in words.
export async function applyItemTo(
	gameId: string,
	item: ShopItemType,
	targetTeamId: string,
	shop: ShopConfig,
	amount?: number,
): Promise<string> {
	const res = await play<{
		outcome: 'cursed' | 'robbed' | 'blocked' | 'donated';
		targetTeamName: string;
		amount: number | null;
	}>('useItem', { gameId, item, targetTeamId, amount }, `use:${item}:${targetTeamId}:${amount ?? ''}`);
	const n = res.amount ?? 0;
	const target = res.targetTeamName;
	return {
		cursed: copy.shop.cursed(target, shop.curse.durationMinutes),
		robbed: copy.shop.robbed(n, target),
		blocked: copy.shop.blocked(target),
		donated: copy.shop.donated(n, target),
	}[res.outcome];
}

// Chat is written straight to the database; the rules check it, and
// Firestore sends it once the phone is back online
export function sendMessage(gameId: string, teamId: string, authorId: string, authorName: string, text: string) {
	return addDoc(collection(db, paths.messages(gameId)), {
		teamId,
		authorId,
		authorName,
		fromHost: false,
		text,
		sentAt: Date.now(),
	});
}

// Leaving takes this player out of the team and the game. The team keeps its
// progress; it belongs to the team, not to any one member.
export function leaveGame(gameId: string) {
	return play('leaveGame', { gameId });
}
