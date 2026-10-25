import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import {
	metersBetween,
	type Game,
	type Quest,
	type QuestProgress,
	type Team,
} from '@grandcityrace/shared';
import { db } from '../../firebase';
import { startTracking, stopTracking, recordPosition } from '../../tasks/distanceTracker';
import type { Coords } from './useLocationTracking';

// Distance progress is pushed to the team doc at most once per this many meters
const DISTANCE_SYNC_STEP_METERS = 20;

// Whether the current quest is open yet, and the team's way there: the
// distance to its place, or the distance walked towards its target.
// `active` is false while nothing may count: before the start, paused,
// cursed, or finished.
export function useQuestProgress({
	team,
	game,
	quest,
	coords,
	active,
}: {
	team: Team | null;
	game: Game | null;
	quest: Quest | null;
	coords: Coords | null;
	active: boolean;
}) {
	const [localMeters, setLocalMeters] = useState(0);

	const progress =
		quest && team?.questProgress?.questId === quest.id ? team.questProgress : null;

	const distanceToQuest =
		coords != null && quest?.location ? metersBetween(coords, quest.location) : null;
	const insideFence =
		distanceToQuest !== null && distanceToQuest <= (quest?.fenceRadius ?? 50);
	const teamMeters = progress?.distanceMeters ?? 0;
	const walkedMeters = Math.max(localMeters, teamMeters);

	let unlocked = false;
	if (quest?.trigger === 'none') unlocked = true;
	// Answer quests need the team at the location; timers and info stay open once reached
	if (quest?.trigger === 'location')
		unlocked = insideFence || (quest.task !== 'answer' && !!progress?.unlockedAt);
	if (quest?.trigger === 'distance')
		unlocked = !!progress?.unlockedAt || walkedMeters >= (quest.distanceMeters ?? 0);

	// Distance walked while cursed doesn't count
	const trackingDistance = active && quest?.trigger === 'distance' && !progress?.unlockedAt;

	// Plain writes from the local snapshot (not transactions) so progress still queues while offline.
	// Concurrent writes from teammates only differ by seconds/meters, so last-write-wins is fine.
	function updateQuestProgress(
		questId: string,
		patch: { distanceMeters?: number; unlock?: boolean },
	) {
		if (!team || !game) return Promise.resolve();
		const existing = team.questProgress?.questId === questId ? team.questProgress : null;
		const next: QuestProgress = {
			questId,
			unlockedAt: existing?.unlockedAt ?? null,
			pausedMsAtUnlock: existing?.pausedMsAtUnlock ?? 0,
			distanceMeters: Math.max(
				existing?.distanceMeters ?? 0,
				Math.round(patch.distanceMeters ?? 0),
			),
		};
		if (patch.unlock && !next.unlockedAt) {
			next.unlockedAt = Date.now();
			next.pausedMsAtUnlock = game.totalPausedMs ?? 0;
		}
		return updateDoc(doc(db, 'teams', team.id), { questProgress: next });
	}

	// Record when timer/info quests unlock so the countdown is shared and survives leaving the fence
	const unlockPendingRef = useRef<string | null>(null);
	useEffect(() => {
		if (!quest || !active || !unlocked || progress?.unlockedAt) return;
		if (quest.task === 'answer' || quest.trigger === 'distance') return;
		if (unlockPendingRef.current === quest.id) return;
		unlockPendingRef.current = quest.id;
		updateQuestProgress(quest.id, { unlock: true }).catch(() => {
			unlockPendingRef.current = null;
		});
	}, [quest?.id, active, unlocked, progress?.unlockedAt]);

	// Start/stop the persistent distance tracker (also fed by the background location task)
	useEffect(() => {
		if (!quest) return;
		if (trackingDistance) {
			startTracking(quest.id, teamMeters)
				.then((s) => setLocalMeters(s.meters))
				.catch(() => {});
		} else {
			stopTracking().catch(() => {});
			setLocalMeters(0);
		}
	}, [quest?.id, trackingDistance]);

	useEffect(() => {
		if (!coords || !trackingDistance || !quest) return;
		const questId = quest.id;
		recordPosition(coords.lat, coords.lng, coords.accuracy)
			.then((s) => {
				if (s?.questId === questId) setLocalMeters(s.meters);
			})
			.catch(() => {});
	}, [coords, trackingDistance, quest?.id]);

	// Share distance progress with the team, and unlock once the target is reached.
	// The local snapshot reflects the write immediately, which stops this from re-firing.
	useEffect(() => {
		if (!trackingDistance || !quest) return;
		const reached = localMeters >= (quest.distanceMeters ?? 0);
		if (!reached && localMeters - teamMeters < DISTANCE_SYNC_STEP_METERS) return;
		updateQuestProgress(quest.id, { distanceMeters: localMeters, unlock: reached }).catch(
			() => {},
		);
	}, [localMeters, teamMeters, trackingDistance, quest?.id]);

	return { progress, unlocked, distanceToQuest, walkedMeters };
}
