import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

// How far each new compass reading moves the arrow on Android (0–1): low
// enough to calm a jittery magnetometer, high enough to follow a turn
const HEADING_SMOOTHING = 0.2;

// The way the phone is pointing. The magnetometer only runs while a compass
// is active, to spare the battery.
export function useHeading(active: boolean) {
	const [heading, setHeading] = useState<number | null>(null);
	const [uncalibrated, setUncalibrated] = useState(false);

	useEffect(() => {
		if (!active) {
			setHeading(null);
			setUncalibrated(false);
			return;
		}
		let sub: Location.LocationSubscription | null = null;
		let cancelled = false;
		// Android hands over the magnetometer's raw readings, which jitter on
		// cheaper phones; iOS smooths its heading itself. The average is taken of
		// directions, not numbers, so it stays right across north (359° → 1°).
		const smoothed = { x: 0, y: 0, started: false };
		Location.watchHeadingAsync((h) => {
			// Both platforms report 0–3 (Expo maps iOS's degrees onto Android's
			// scale); 1 is low, 0 unreliable
			setUncalibrated(h.accuracy <= 1);
			const raw = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
			if (Platform.OS !== 'android') {
				setHeading(raw);
				return;
			}
			const r = (raw * Math.PI) / 180;
			if (!smoothed.started) {
				smoothed.x = Math.cos(r);
				smoothed.y = Math.sin(r);
				smoothed.started = true;
			} else {
				smoothed.x += (Math.cos(r) - smoothed.x) * HEADING_SMOOTHING;
				smoothed.y += (Math.sin(r) - smoothed.y) * HEADING_SMOOTHING;
			}
			setHeading(((Math.atan2(smoothed.y, smoothed.x) * 180) / Math.PI + 360) % 360);
		})
			.then((s) => {
				if (cancelled) s.remove();
				else sub = s;
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			sub?.remove();
		};
	}, [active]);

	return { heading, uncalibrated };
}
