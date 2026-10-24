import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	ScrollView,
	StyleSheet,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '@grandcityrace/shared';
import Icon from '../theme/Icon';
import { useTheme } from '../theme/ThemeContext';
import * as ui from '../theme/primitives';
import { copy } from '@grandcityrace/shared';

// Shown before the system prompts, so the permission dialogs arrive with a
// reason attached rather than ambushing a player on first launch.
export default function PermissionsIntro({
	visible,
	onContinue,
}: {
	visible: boolean;
	onContinue: () => void;
}) {
	const theme = useTheme();
	const styles = makeStyles(theme);
	const { colors } = theme;
	const insets = useSafeAreaInsets();
	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onContinue}>
			{/* Scrolls on small screens, and stays clear of the camera cutout
			    and the navigation bar, which Android draws over the app */}
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.wrap,
					{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
				]}
			>
				<Text style={styles.title}>{copy.permissions.title}</Text>

				<View style={styles.item}>
					<View style={styles.itemTitleRow}>
						<Icon name="map-marker-outline" size={20} color={colors.onSurface} />
						<Text style={styles.itemTitle}>{copy.permissions.location}</Text>
					</View>
					{/* The app stores require this disclosure before the prompt, and
					    Google Play requires its wording: what is collected, for which
					    features, and that it happens when the app is closed or not in use */}
					<Text style={styles.itemText}>{copy.permissions.locationWhat}</Text>
					<Text style={styles.itemText}>
						{copy.permissions.locationWho(
							Platform.OS === 'ios'
								? copy.permissions.alwaysIos
								: copy.permissions.alwaysAndroid,
						)}
					</Text>
				</View>

				<View style={styles.item}>
					<View style={styles.itemTitleRow}>
						<Icon name="bell-outline" size={20} color={colors.onSurface} />
						<Text style={styles.itemTitle}>{copy.permissions.notifications}</Text>
					</View>
					<Text style={styles.itemText}>{copy.permissions.notificationsWhat}</Text>
				</View>

				<Text style={styles.footnote}>{copy.permissions.footnote}</Text>

				<TouchableOpacity style={styles.button} onPress={onContinue}>
					<Text style={styles.buttonText}>{copy.permissions.gotIt}</Text>
				</TouchableOpacity>
				<Text style={styles.footnote}>{copy.permissions.nextNote}</Text>
			</ScrollView>
		</Modal>
	);
}

function makeStyles(t: Theme) {
	const c = t.colors;
	return StyleSheet.create({
		scroll: {
			flex: 1,
			backgroundColor: c.background,
		},
		wrap: {
			flexGrow: 1,
			paddingHorizontal: 28,
			justifyContent: 'center',
		},
		title: {
			...ui.heading(t, 30),
			marginBottom: 28,
		},
		item: {
			...ui.panel(t),
			padding: 16,
			marginBottom: 16,
		},
		itemTitleRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 6,
		},
		itemTitle: {
			fontFamily: t.fonts.display,
			fontSize: 17,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.onSurface,
		},
		itemText: {
			fontSize: 15,
			color: c.onSurface,
			lineHeight: 22,
			marginBottom: 6,
		},
		footnote: {
			fontSize: 13,
			color: c.muted,
			lineHeight: 19,
			marginTop: 8,
			marginBottom: 16,
		},
		button: {
			...ui.button(t),
			paddingVertical: 16,
		},
		buttonText: ui.buttonText(t),
	});
}
