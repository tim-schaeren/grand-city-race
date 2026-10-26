import type { ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { copy, formatClock } from '@grandcityrace/shared';
import Icon from '../../theme/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { useStyles } from './styles';

// Box widths as a share of the font size. Each character sits in a box of
// its own: the display fonts have no fixed-width digits, so a "1" would
// otherwise be narrower than an "8" and the clock would wobble every second.
const DIGIT_WIDTH = 0.66;
const COLON_WIDTH = 0.32;

// A clock that keeps its size: the font size comes from the screen width
// once, rather than being re-fitted to every new reading
export function Countdown({ ms }: { ms: number }) {
	const styles = useStyles();
	const { fonts } = useTheme();
	const { width } = useWindowDimensions();
	const text = formatClock(ms);
	const units = 6 * DIGIT_WIDTH + 2 * COLON_WIDTH;
	const fontSize = Math.min(72, Math.floor((width - 64) / units));
	return (
		<View style={styles.countdownRow}>
			{text.split('').map((char, i) => (
				<Text
					key={i}
					style={[
						styles.countdown,
						{
							fontSize: fontSize * fonts.scale,
							lineHeight: Math.round(fontSize * 1.2),
							width: fontSize * (char === ':' ? COLON_WIDTH : DIGIT_WIDTH),
						},
					]}
				>
					{char}
				</Text>
			))}
		</View>
	);
}

export function ScrollContainer({ children }: { children: ReactNode }) {
	const styles = useStyles();
	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
		>
			{children}
		</ScrollView>
	);
}

export function ContinueButton({
	disabled,
	label,
	onPress,
}: {
	disabled: boolean;
	label: string;
	onPress: () => void;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	return (
		<TouchableOpacity
			style={[styles.continueButton, disabled && styles.submitButtonDisabled]}
			onPress={onPress}
			disabled={disabled}
		>
			<Text style={styles.continueButtonText}>{label}</Text>
			<Icon name="arrow-right" size={20} color={colors.onAccent} />
		</TouchableOpacity>
	);
}

// A quest the hosts changed while the team was on it says so, so nothing
// changes silently under the team
export function EditedNote({ at }: { at?: number }) {
	const { colors } = useTheme();
	if (!at) return null;
	const time = new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	return (
		<Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
			{copy.quest.edited(time)}
		</Text>
	);
}
