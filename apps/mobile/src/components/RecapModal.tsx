import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { doc, getDoc } from 'firebase/firestore';
import { copy } from '@grandcityrace/shared';
import { db } from '../firebase';
import { WEB_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';
import * as ui from '../theme/primitives';

// The recap is a page on the website, the same one hosts see in the console.
// The app reads the recap the player may see and hands it to the page, so the
// page needs no sign-in of its own. Against a console running on this
// computer, set EXPO_PUBLIC_WEB_URL to its address.
const RECAP_SITE = process.env.EXPO_PUBLIC_WEB_URL ?? WEB_URL;

export default function RecapModal({
	gameId,
	themeId,
	teamId,
	visible,
	onClose,
}: {
	gameId: string;
	themeId: string | undefined;
	teamId: string | null;
	visible: boolean;
	onClose: () => void;
}) {
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const [recap, setRecap] = useState<unknown>(undefined);

	useEffect(() => {
		if (!visible) return;
		setRecap(undefined);
		getDoc(doc(db, 'games', gameId, 'recap', 'summary'))
			.then((snap) => setRecap(snap.exists() ? snap.data() : null))
			.catch(() => setRecap(null));
	}, [visible, gameId]);

	const inject = recap
		? `window.__RECAP__ = ${JSON.stringify({ recap, themeId, viewerTeamId: teamId })}; true;`
		: '';

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
			<StatusBar style={theme.dark ? 'light' : 'dark'} />
			<View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
				{recap ? (
					<WebView
						source={{ uri: `${RECAP_SITE}/recap/${gameId}` }}
						injectedJavaScriptBeforeContentLoaded={inject}
						onMessage={(e) => e.nativeEvent.data === 'close' && onClose()}
						style={{ backgroundColor: theme.colors.background }}
						bounces={false}
					/>
				) : (
					<View style={styles.center}>
						{recap === undefined ? (
							<ActivityIndicator size="large" color={theme.colors.text} />
						) : (
							<>
								<Text style={[styles.message, { color: theme.colors.text }]}>{copy.recap.notReady}</Text>
								<TouchableOpacity style={[ui.button(theme), styles.button]} onPress={onClose}>
									<Text style={ui.buttonText(theme)}>{copy.recap.close}</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				)}
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 24 },
	message: { fontSize: 16, textAlign: 'center', lineHeight: 23 },
	button: { paddingHorizontal: 32, paddingVertical: 14 },
});
