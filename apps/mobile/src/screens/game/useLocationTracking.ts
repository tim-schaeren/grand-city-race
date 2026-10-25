import { useState, useEffect, useRef } from 'react';
import { doc, collection, addDoc, updateDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { copy, metersBetween, type Game, type Team } from '@grandcityrace/shared';
import { db, auth } from '../../firebase';
import { TASK_NAME as LOCATION_TASK, stopBackgroundTracking } from '../../tasks/locationTask';
import { requestPushToken } from '../../utils/pushToken';
import { savePosition } from '../../utils/privateEntry';

export interface Coords {
	lat: number;
	lng: number;
	accuracy: number | null;
}

type Point = { lat: number; lng: number; t: number };

// Where the player is, and everything that follows from it: the permission
// prompts (behind an explainer, so they arrive with a reason), the position
// the hosts see, the team's trail, and the background task.
//
// Location is read only while the race is on for this player: from the
// start until the game ends or their team finishes. Joining early asks for
// the permissions, so nobody meets the prompts at the start line, but
// tracks nothing until the start.
export function useLocationTracking(team: Team | null, game: Game | null, now: number) {
	const [coords, setCoords] = useState<Coords | null>(null);
	const [denied, setDenied] = useState(false);
	const [introState, setIntroState] = useState<'unknown' | 'show' | 'done'>('unknown');
	const [permissionsAsked, setPermissionsAsked] = useState(false);
	const lastWrittenRef = useRef<Point | null>(null);
	const lastTrailRef = useRef<Point | null>(null);

	// v2: the location wording changed, so everyone reads it once more
	useEffect(() => {
		AsyncStorage.getItem('permissionsIntro:v2')
			.then((seen) => setIntroState(seen ? 'done' : 'show'))
			.catch(() => setIntroState('show'));
	}, []);

	async function finishIntro(grantNow: boolean) {
		setIntroState('done');
		AsyncStorage.setItem('permissionsIntro:v2', String(Date.now())).catch(() => {});
		if (!grantNow) return;
		// Notifications are asked for here rather than at app launch, so the
		// prompt follows the explanation of what they are for
		try {
			const token = await requestPushToken();
			const uid = auth.currentUser?.uid;
			if (token && uid) {
				await updateDoc(doc(db, 'users', uid), { pushToken: token });
			}
		} catch {
			// Push is optional; the game works without it
		}
	}

	useEffect(() => {
		if (introState !== 'done') return;
		(async () => {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				setDenied(true);
				return;
			}
			// "Always", for the background task. Background location isn't
			// available in every host app (Expo Go throws ERR_LOCATION_INFO_PLIST),
			// so failing here must not stop foreground tracking.
			await Location.requestBackgroundPermissionsAsync().catch(() => {});
			setPermissionsAsked(true);
		})();
	}, [introState]);

	const raceOver = !!game?.endedAt || !!team?.finishedAt;
	const raceStarted = !!game && now >= game.startDateTime;
	const tracking = permissionsAsked && raceStarted && !raceOver && !!team && !!game;

	// Watch the position; write it, and the trail, to Firestore (throttled)
	useEffect(() => {
		if (!tracking || !team || !game) return;
		let sub: Location.LocationSubscription | null = null;
		let cancelled = false;
		(async () => {
			// Persist IDs for background task, and whether teammates need this
			// player's position (see useTeamSpread)
			const uid = auth.currentUser?.uid ?? '';
			await AsyncStorage.multiSet([
				['uid', uid],
				['teamId', team.id],
				['gameId', game.id],
				['spreadCheck', game.maxTeamSpreadMeters ? '1' : ''],
			]);

			try {
				const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
				if (bgStatus === 'granted' && !cancelled) {
					const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
					if (!running) {
						await Location.startLocationUpdatesAsync(LOCATION_TASK, {
							accuracy: Location.Accuracy.Balanced,
							distanceInterval: 50,
							timeInterval: 60000,
							showsBackgroundLocationIndicator: true,
							// Android throttles background location to a few updates an
							// hour unless it runs as a foreground service, which also
							// tells the player, in a notification, that it is running
							foregroundService: {
								notificationTitle: copy.backgroundLocation.title,
								notificationBody: copy.backgroundLocation.body,
								notificationColor: '#111111',
							},
						});
					}
				}
			} catch {
				// Foreground tracking still works; the team trail just won't update in the background
			}

			const watch = await Location.watchPositionAsync(
				{ accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
				(loc) => {
					const { latitude: lat, longitude: lng, accuracy } = loc.coords;
					setCoords({ lat, lng, accuracy });

					const currentUid = auth.currentUser?.uid;
					if (!currentUid) return;

					const t = Date.now();
					const last = lastWrittenRef.current;
					const dist = last ? metersBetween(last, { lat, lng }) : Infinity;
					const elapsed = last ? t - last.t : Infinity;

					// Write lastLocation every 10 m or 30 s
					if (dist > 10 || elapsed > 30000) {
						lastWrittenRef.current = { lat, lng, t };
						// Teammates read it from the profile for the spread check, so
						// it goes there only when the race limits the spread
						if (game.maxTeamSpreadMeters) {
							updateDoc(doc(db, 'users', currentUid), {
								lastLocation: { lat, lng, updatedAt: t },
							}).catch(() => {});
						}
						// Hosts read positions from the player's private entry in the
						// game, never from profiles, which also hold the email address
						savePosition(game.id, currentUid, { lat, lng, updatedAt: t }).catch(() => {});

						// Write trail point every 50 m or 2 min
						const lastTrail = lastTrailRef.current;
						const trailDist = lastTrail ? metersBetween(lastTrail, { lat, lng }) : Infinity;
						const trailElapsed = lastTrail ? t - lastTrail.t : Infinity;
						if (trailDist > 50 || trailElapsed > 120000) {
							lastTrailRef.current = { lat, lng, t };
							addDoc(collection(db, 'trail'), {
								userId: currentUid,
								teamId: team.id,
								gameId: game.id,
								lat,
								lng,
								t,
							}).catch(() => {});
						}
					}
				},
			);
			if (cancelled) watch.remove();
			else sub = watch;
		})();
		return () => {
			cancelled = true;
			sub?.remove();
		};
	}, [tracking, team?.id, game?.id]);

	// The background task runs only while tracking: it stops before the start
	// (a player who joined early) and once the race is over. Leaving the game,
	// signing out and deleting the account all unmount the game screen.
	useEffect(() => {
		if (permissionsAsked && !tracking) stopBackgroundTracking();
	}, [permissionsAsked, tracking]);
	useEffect(() => () => void stopBackgroundTracking(), []);

	return {
		coords,
		denied,
		introVisible: introState === 'show',
		finishIntro,
	};
}
