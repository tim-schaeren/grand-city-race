import { useEffect, useRef } from 'react';
import { Animated, AppState, Easing, StyleSheet, Text, View } from 'react-native';
import {
	createAudioPlayer,
	setAudioModeAsync,
	type AudioPlayer,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { Theme } from '@grandcityrace/shared';
import { useTheme } from '../theme/ThemeContext';
import { copy, formatMinutesLeft } from '@grandcityrace/shared';

const PING = require('../../assets/sounds/radar-ping.wav');
const SIZE = 180;
// Pings overlap when they come fast, so several players take turns
const PLAYERS = 4;

// Plays the ping. The phone takes the audio session away while the app is in
// the background, which leaves players silent, so they are made afresh each
// time the app comes back. Each one rewinds before playing: playing while the
// rewind is still under way starts from the end, which is silence.
function usePing() {
	const play = useRef<() => void>(() => {});
	useEffect(() => {
		let players: AudioPlayer[] = [];
		let next = 0;
		const setUp = () => {
			// Pings mix with whatever else is playing and respect the silent switch
			setAudioModeAsync({
				playsInSilentMode: false,
				interruptionMode: 'mixWithOthers',
				shouldPlayInBackground: false,
			}).catch(() => {});
			players.forEach((p) => p.remove());
			players = Array.from({ length: PLAYERS }, () => createAudioPlayer(PING));
		};
		setUp();
		play.current = () => {
			const player = players[next++ % players.length];
			player
				.seekTo(0)
				.then(() => player.play())
				.catch(() => {});
		};
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') setUp();
		});
		return () => {
			sub.remove();
			players.forEach((p) => p.remove());
		};
	}, []);
	return play;
}

// How long between pings: every half second when you're on top of it, every
// three seconds a kilometre out, on a log scale so the change is felt where
// it matters — the last few hundred metres
function pingInterval(meters: number): number {
	const near = 25;
	const far = 1000;
	const d = Math.min(Math.max(meters, near), far);
	const share = Math.log(d / near) / Math.log(far / near);
	return 500 + share * 2500;
}

// Distance only, never direction: a sweeping dial and a ping that speeds up as
// the team closes in. Sound respects the phone's silent switch.
export default function Radar({
	distance,
	msLeft,
}: {
	distance: number | null;
	msLeft: number;
}) {
	const theme = useTheme();
	const styles = makeStyles(theme);
	const playPing = usePing();
	const sweep = useRef(new Animated.Value(0)).current;
	const blip = useRef(new Animated.Value(0)).current;
	const distanceRef = useRef(distance);
	distanceRef.current = distance;

	// The beam turns steadily, whatever the distance
	useEffect(() => {
		const loop = Animated.loop(
			Animated.timing(sweep, {
				toValue: 1,
				duration: 2400,
				easing: Easing.linear,
				useNativeDriver: true,
			}),
		);
		loop.start();
		return () => loop.stop();
	}, []);

	// Each ping schedules the next, so a change in distance takes effect at once
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;
		let stopped = false;
		const ping = () => {
			if (stopped) return;
			const meters = distanceRef.current;
			if (meters !== null) {
				playPing.current();
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
				blip.setValue(0);
				Animated.timing(blip, {
					toValue: 1,
					duration: 900,
					easing: Easing.out(Easing.quad),
					useNativeDriver: true,
				}).start();
			}
			timer = setTimeout(ping, pingInterval(meters ?? 1000));
		};
		timer = setTimeout(ping, 300);
		return () => {
			stopped = true;
			clearTimeout(timer);
		};
	}, []);

	const rotate = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
	const left = formatMinutesLeft(msLeft);

	return (
		<View style={styles.wrap}>
			<View style={styles.dial}>
				<View style={[styles.ring, { width: SIZE * 0.66, height: SIZE * 0.66, borderRadius: SIZE * 0.33 }]} />
				<View style={[styles.ring, { width: SIZE * 0.33, height: SIZE * 0.33, borderRadius: SIZE * 0.165 }]} />
				<Animated.View style={[styles.beamArm, { transform: [{ rotate }] }]}>
					<View style={styles.beam} />
				</Animated.View>
				<Animated.View
					style={[
						styles.pulse,
						{
							opacity: blip.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
							transform: [{ scale: blip.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) }],
						},
					]}
				/>
				<View style={styles.centre} />
			</View>
			<Text style={styles.distance}>
				{distance === null
					? copy.radar.finding
					: copy.common.metersAway(Math.round(distance))}
			</Text>
			<Text style={styles.meta}>{copy.radar.meta(left)}</Text>
		</View>
	);
}

function makeStyles(t: Theme) {
	const c = t.colors;
	return StyleSheet.create({
		wrap: {
			alignItems: 'center',
			marginBottom: 16,
		},
		dial: {
			width: SIZE,
			height: SIZE,
			borderRadius: SIZE / 2,
			borderWidth: Math.max(2, t.shape.borderWidth),
			borderColor: c.accent,
			backgroundColor: c.surface,
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
		},
		ring: {
			position: 'absolute',
			borderWidth: 1,
			borderColor: c.mutedOnSurface,
			opacity: 0.4,
		},
		// A full-size square that turns; the beam sits on its upper half
		beamArm: {
			position: 'absolute',
			width: SIZE,
			height: SIZE,
			alignItems: 'center',
		},
		beam: {
			width: 3,
			height: SIZE / 2,
			backgroundColor: c.accent,
			borderRadius: 2,
		},
		pulse: {
			position: 'absolute',
			width: SIZE,
			height: SIZE,
			borderRadius: SIZE / 2,
			borderWidth: 4,
			borderColor: c.accent,
		},
		centre: {
			width: 10,
			height: 10,
			borderRadius: 5,
			backgroundColor: c.accent,
		},
		distance: {
			fontSize: 18,
			fontWeight: '600',
			color: c.text,
			marginTop: 12,
		},
		meta: {
			fontSize: 14,
			color: c.muted,
			marginTop: 6,
			fontVariant: ['tabular-nums'],
		},
	});
}
