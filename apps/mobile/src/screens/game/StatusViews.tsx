import { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import {
	copy,
	formatDuration,
	raceTimeMs,
	type Game,
	type Team,
} from '@grandcityrace/shared';
import RecapModal from '../../components/RecapModal';
import Icon from '../../theme/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { Countdown } from './parts';
import { useStyles } from './styles';

// What fills the screen when there's no quest to play: before the start,
// paused, cursed, finished, over

export function WaitingView({ game, now }: { game: Game; now: number }) {
	const styles = useStyles();
	const ms = game.startDateTime - now;
	return (
		<View style={styles.container}>
			<Text style={styles.label}>{copy.waiting.getReady}</Text>
			<Text style={styles.gameName}>{game.name}</Text>
			{ms > 0 ? (
				<>
					<Text style={styles.countdownLabel}>{copy.waiting.startsIn}</Text>
					<Countdown ms={ms} />
				</>
			) : (
				// Its time has come, but the hosts have something to fix first
				<Text style={styles.countdownLabel}>{copy.waiting.startingSoon}</Text>
			)}
		</View>
	);
}

export function FinishedView({
	game,
	team,
	allTeams,
	onLeaderboard,
}: {
	game: Game;
	team: Team;
	allTeams: Team[];
	onLeaderboard: () => void;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	const rank = allTeams.filter(
		(t) => t.finishedAt && t.finishedAt <= (team.finishedAt ?? 0),
	).length;
	const duration = raceTimeMs(team, game) ?? 0;
	return (
		<View style={styles.container}>
			<View style={styles.finishedIcon}>
				<Icon name="flag-checkered" size={72} color={colors.text} />
			</View>
			<Text style={styles.finishedHeading}>{copy.finished.heading}</Text>
			<Text style={styles.finishedPlacement}>
				{copy.finished.placement(rank)}
			</Text>
			<Text style={styles.finishedSub}>{formatDuration(duration)}</Text>
			<TouchableOpacity
				style={styles.leaderboardButton}
				onPress={onLeaderboard}
			>
				<Text style={styles.leaderboardButtonText}>
					{copy.finished.seeLeaderboard}
				</Text>
				<Icon name="arrow-right" size={18} color={colors.text} />
			</TouchableOpacity>
		</View>
	);
}

export function PausedView() {
	const styles = useStyles();
	const { colors } = useTheme();
	return (
		<View style={styles.container}>
			<View style={styles.finishedIcon}>
				<Icon name="pause-circle-outline" size={96} color={colors.text} />
			</View>
			<Text style={styles.finishedHeading}>{copy.paused.heading}</Text>
			<Text style={styles.message}>{copy.paused.message}</Text>
		</View>
	);
}

export function EndedView({ game, teamId }: { game: Game; teamId: string | null }) {
	const styles = useStyles();
	const { colors } = useTheme();
	const [recapOpen, setRecapOpen] = useState(false);
	return (
		<View style={styles.container}>
			<View style={styles.finishedIcon}>
				<Icon name="flag-checkered" size={72} color={colors.text} />
			</View>
			<Text style={styles.finishedHeading}>{copy.ended.heading}</Text>
			<Text style={styles.finishedSub}>{copy.ended.thanks}</Text>
			{/* The hosts decide when the recap is ready */}
			{!!game.recapPublishedAt && (
				<>
					<TouchableOpacity style={styles.recapButton} onPress={() => setRecapOpen(true)}>
						<Text style={styles.recapButtonText}>{copy.recap.open}</Text>
						<Icon name="arrow-right" size={18} color={colors.onAccent} />
					</TouchableOpacity>
					<RecapModal
						gameId={game.id}
						themeId={game.themeId}
						teamId={teamId}
						visible={recapOpen}
						onClose={() => setRecapOpen(false)}
					/>
				</>
			)}
		</View>
	);
}

export function SpreadOverlay() {
	const styles = useStyles();
	return (
		<View style={styles.spreadOverlay}>
			<Text style={styles.spreadTitle}>{copy.spread.title}</Text>
			<Text style={styles.spreadMessage}>{copy.spread.message}</Text>
		</View>
	);
}

// A cursed team is frozen: no hint, no answers, no shop, and walking doesn't
// count, until the curse wears off
export function CursedView({ by, msLeft }: { by: string; msLeft: number }) {
	const styles = useStyles();
	const { colors } = useTheme();
	const total = Math.ceil(msLeft / 1000);
	return (
		<View style={styles.container}>
			<View style={styles.finishedIcon}>
				<Icon name="skull-outline" size={96} color={colors.text} />
			</View>
			<Text style={styles.finishedHeading}>{copy.cursed.heading}</Text>
			<Text style={styles.finishedSub}>{copy.cursed.by(by)}</Text>
			<Countdown ms={total * 1000} />
			<Text style={[styles.message, { marginTop: 24 }]}>
				{copy.cursed.message}
			</Text>
		</View>
	);
}

export function LocationDeniedView() {
	const styles = useStyles();
	return (
		<View style={styles.container}>
			<Text style={styles.heading}>{copy.locationDenied.heading}</Text>
			<Text style={styles.message}>{copy.locationDenied.message}</Text>
		</View>
	);
}

// ─── Celebration overlay ──────────────────────────────────────────────────────

export function CelebrationOverlay({
	visible,
	anim,
}: {
	visible: boolean;
	anim: Animated.Value;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	if (!visible) return null;
	const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
	return (
		<Animated.View style={[styles.celebrationOverlay, { opacity: anim }]}>
			<Animated.View
				style={[styles.celebrationIcon, { transform: [{ scale }] }]}
			>
				<Icon name="party-popper" size={88} color={colors.text} />
			</Animated.View>
			<Text style={styles.celebrationText}>{copy.celebration}</Text>
		</Animated.View>
	);
}
