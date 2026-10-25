import { useState, useEffect, useRef } from 'react';
import { metersBetween, type QuestView } from '@grandcityrace/shared';
import { startTracking, stopTracking, recordPosition } from '../../tasks/distanceTracker';
import * as actions from './actions';
import type { Coords } from './useLocationTracking';

// Distance walked is reported to the server at most once per this many meters
const DISTANCE_REPORT_STEP_METERS = 20;
// Unlocking and distance happen without a tap, so without a connection they
// are tried again after this long, even if the team stands still
const RETRY_AFTER_MS = 10_000;

// Whether the current quest is open on this phone, and the team's way there:
// the distance to its place, or the distance walked towards its target. The
// server decides what is open; the phone notices when the team has arrived
// and asks. `active` is false while nothing may count: before the start,
// paused, cursed, or finished.
export function useQuestProgress({
	gameId,
	view,
	coords,
	active,
}: {
	gameId: string;
	view: QuestView | null;
	coords: Coords | null;
	active: boolean;
}) {
	const [localMeters, setLocalMeters] = useState(0);
	const [retryTick, setRetryTick] = useState(0);
	const retryLater = () => setTimeout(() => setRetryTick((n) => n + 1), RETRY_AFTER_MS);

	const distanceToQuest = coords && view?.location ? metersBetween(coords, view.location) : null;
	const insideFence = distanceToQuest !== null && distanceToQuest <= (view?.fenceRadius ?? 50);
	const teamMeters = view?.walkedMeters ?? 0;
	const walkedMeters = Math.max(localMeters, teamMeters);

	// An answer at a place is only shown there; everything else stays open once
	// the server has opened it
	const unlocked = !!view?.unlockedAt
		&& !(view.trigger === 'location' && view.task === 'answer' && !insideFence);

	// Arrived: ask the server to open the quest, with the position
	const unlockAsked = useRef<string | null>(null);
	useEffect(() => {
		if (!view || !active || !coords || view.trigger !== 'location' || view.unlockedAt || !insideFence) return;
		if (unlockAsked.current === view.questId) return;
		unlockAsked.current = view.questId;
		actions.unlock(gameId, view.questId, coords).catch(() => {
			unlockAsked.current = null;
			retryLater();
		});
	}, [view?.questId, view?.unlockedAt, insideFence, active, coords, retryTick]);

	// Distance walked while cursed doesn't count
	const trackingDistance = active && view?.trigger === 'distance' && !view.unlockedAt;

	// Start/stop the persistent distance tracker (also fed by the background location task)
	useEffect(() => {
		if (!view) return;
		if (trackingDistance) {
			startTracking(view.questId, teamMeters)
				.then((s) => setLocalMeters(s.meters))
				.catch(() => {});
		} else {
			stopTracking().catch(() => {});
			setLocalMeters(0);
		}
	}, [view?.questId, trackingDistance]);

	useEffect(() => {
		if (!coords || !trackingDistance || !view) return;
		const questId = view.questId;
		recordPosition(coords.lat, coords.lng, coords.accuracy)
			.then((s) => {
				if (s?.questId === questId) setLocalMeters(s.meters);
			})
			.catch(() => {});
	}, [coords, trackingDistance, view?.questId]);

	// Report the distance in steps, and once more at the target; the server
	// opens the quest when the team has walked far enough
	const reported = useRef({ questId: '', meters: 0 });
	useEffect(() => {
		if (!trackingDistance || !view) return;
		if (reported.current.questId !== view.questId) reported.current = { questId: view.questId, meters: teamMeters };
		const reached = localMeters >= (view.distanceMeters ?? 0);
		if (!reached && localMeters - reported.current.meters < DISTANCE_REPORT_STEP_METERS) return;
		if (reached && reported.current.meters >= localMeters) return;
		const before = reported.current.meters;
		reported.current.meters = localMeters;
		actions.reportDistance(gameId, view.questId, localMeters).catch(() => {
			reported.current.meters = before;
			retryLater();
		});
	}, [localMeters, trackingDistance, view?.questId, retryTick]);

	return { unlocked, distanceToQuest, walkedMeters };
}
