import { useRef, useEffect } from 'react';
import { View, Text, Animated, Easing, Platform } from 'react-native';
import { copy, formatMinutesLeft, type QuestView } from '@grandcityrace/shared';
import ContentBlocks from '../../components/ContentBlocks';
import Radar from '../../components/Radar';
import Icon from '../../theme/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { ScrollContainer } from './parts';
import { useStyles } from './styles';

// Before a quest unlocks: the way to the next place, or the distance to cover

export function CompassArrow({
	bearing,
	heading,
	uncalibrated,
	distance,
	msLeft,
}: {
	bearing: number;
	heading: number | null;
	uncalibrated: boolean;
	distance: number | null;
	msLeft: number;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	// With a device heading the arrow points the real way; without one it still
	// shows the bearing, just relative to north
	const rotation = heading === null ? bearing : bearing - heading;
	// The angle keeps counting past 360 so the arrow always turns the shorter
	// way. Android glides between readings; iOS readings are already smooth.
	const angle = useRef(new Animated.Value(rotation)).current;
	const lastAngle = useRef(rotation);
	useEffect(() => {
		const delta = ((((rotation - lastAngle.current) % 360) + 540) % 360) - 180;
		const next = lastAngle.current + delta;
		lastAngle.current = next;
		if (Platform.OS === 'android') {
			Animated.timing(angle, {
				toValue: next,
				duration: 200,
				easing: Easing.out(Easing.quad),
				useNativeDriver: true,
			}).start();
		} else {
			angle.setValue(next);
		}
	}, [rotation]);
	const rotate = angle.interpolate({
		inputRange: [-360, 360],
		outputRange: ['-360deg', '360deg'],
	});
	const left = formatMinutesLeft(msLeft);
	return (
		<View style={styles.compassWrap}>
			<View style={styles.compassDial}>
				<Animated.View style={{ transform: [{ rotate }] }}>
					<Icon name="navigation" size={48} color={colors.accent} />
				</Animated.View>
			</View>
			{distance !== null && (
				<Text style={styles.compassDistance}>
					{copy.common.metersAway(Math.round(distance))}
				</Text>
			)}
			<Text style={styles.compassMeta}>
				{copy.compass.meta(heading === null, left)}
			</Text>
			{uncalibrated && (
				<Text style={styles.compassHint}>{copy.compass.calibrate}</Text>
			)}
		</View>
	);
}

export function NavigationView({
	quest,
	distance,
	bearing,
	heading,
	headingUncalibrated,
	compassMsLeft,
	radarMsLeft,
}: {
	quest: QuestView;
	headingUncalibrated: boolean;
	radarMsLeft: number;
	distance: number | null;
	bearing: number | null;
	heading: number | null;
	compassMsLeft: number;
}) {
	const styles = useStyles();
	return (
		<ScrollContainer>
			<Text style={styles.label}>{copy.navigation.findNext}</Text>
			<View style={styles.hintPanel}>
				<ContentBlocks
					blocks={quest.navigationHint}
					textStyle={styles.navigationHint}
				/>
			</View>
			{compassMsLeft > 0 && bearing !== null && (
				<CompassArrow
					bearing={bearing}
					heading={heading}
					uncalibrated={headingUncalibrated}
					distance={distance}
					msLeft={compassMsLeft}
				/>
			)}
			{/* The compass says more, so the radar steps aside while both run */}
			{radarMsLeft > 0 && compassMsLeft <= 0 && (
				<Radar distance={distance} msLeft={radarMsLeft} />
			)}
		</ScrollContainer>
	);
}

export function DistanceView({ quest, meters }: { quest: QuestView; meters: number }) {
	const styles = useStyles();
	const target = quest.distanceMeters ?? 0;
	const fraction = target > 0 ? Math.min(meters / target, 1) : 1;
	return (
		<ScrollContainer>
			<Text style={styles.label}>{copy.navigation.keepMoving}</Text>
			{quest.navigationHint.length > 0 && (
				<View style={styles.hintPanel}>
					<ContentBlocks
						blocks={quest.navigationHint}
						textStyle={styles.navigationHint}
					/>
				</View>
			)}
			{quest.showDistanceProgress !== false && (
				<>
					<View style={styles.progressTrack}>
						<View
							style={[styles.progressFill, { width: `${fraction * 100}%` }]}
						/>
					</View>
					<Text style={styles.distance}>
						{copy.navigation.walked(
							Math.round(Math.min(meters, target)),
							Math.round(target),
						)}
					</Text>
				</>
			)}
		</ScrollContainer>
	);
}
