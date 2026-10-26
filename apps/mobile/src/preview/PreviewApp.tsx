import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PREVIEW_READY, PREVIEW_SCENE, themeFor, type PreviewScene } from '@grandcityrace/shared';
import Icon from '../theme/Icon';
import { FONTS } from '../theme/fonts';
import { ThemeProvider } from '../theme/ThemeContext';
import { DistanceView, NavigationView } from '../screens/game/FindingViews';
import { InfoView, QuestView, TimerView } from '../screens/game/QuestViews';
import { stylesFor } from '../screens/game/styles';

const noop = () => {};

// The console's phone preview, built for the web: the app's own quest
// screens, showing whatever quest and moment the console sends. Nothing here
// signs in or reads the database.
export default function PreviewApp() {
	const [fontsLoaded, fontError] = useFonts(FONTS);
	const [scene, setScene] = useState<PreviewScene | null>(null);

	useEffect(() => {
		const receive = (event: MessageEvent) => {
			if (event.source === window.parent && event.data?.type === PREVIEW_SCENE) setScene(event.data.scene);
		};
		window.addEventListener('message', receive);
		window.parent.postMessage({ type: PREVIEW_READY }, '*');
		return () => window.removeEventListener('message', receive);
	}, []);

	if ((!fontsLoaded && !fontError) || !scene) return null;
	return (
		<SafeAreaProvider>
			<ThemeProvider themeId={scene.themeId}>
				<Screen scene={scene} />
			</ThemeProvider>
		</SafeAreaProvider>
	);
}

function Screen({ scene }: { scene: PreviewScene }) {
	const theme = themeFor(scene.themeId);
	const styles = stylesFor(theme);
	const { quest, moment } = scene;
	const header = { quest, questNumber: scene.questNumber, totalQuests: scene.totalQuests, submitting: false, notice: null, onContinue: noop };

	function content() {
		if (!quest.unlockedAt) {
			if (quest.trigger === 'distance') return <DistanceView quest={quest} meters={quest.walkedMeters} />;
			// The compass and radar point at a place 340 m ahead and a little to the right
			return (
				<NavigationView
					quest={quest}
					distance={340}
					bearing={moment === 'compass' ? 30 : null}
					heading={moment === 'compass' ? 0 : null}
					headingUncalibrated={false}
					compassMsLeft={moment === 'compass' ? 5 * 60_000 : 0}
					radarMsLeft={moment === 'radar' ? 5 * 60_000 : 0}
				/>
			);
		}
		if (quest.task === 'timer') return <TimerView {...header} remainingMs={(quest.durationSeconds ?? 0) * 1000} />;
		if (quest.task === 'continue') return <InfoView {...header} />;
		return (
			<QuestView
				{...header}
				answer={moment === 'wrong' ? '…' : ''}
				setAnswer={noop}
				wrong={moment === 'wrong'}
				onSubmit={noop}
				hintCost={scene.hintCost}
				coins={scene.coins}
				onRevealHint={noop}
			/>
		);
	}

	// The coins and menu buttons that sit over every game screen
	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background }}>
			{content()}
			<View style={[styles.coinPill, { top: 8 }]}>
				<Icon name="circle-multiple-outline" size={16} color={theme.colors.onSurface} />
				<Text style={styles.coinPillText}>{scene.coins}</Text>
				{moment === 'compass' && <Icon name="compass-outline" size={16} color={theme.colors.onSurface} />}
				{moment === 'radar' && <Icon name="radar" size={16} color={theme.colors.onSurface} />}
			</View>
			<View style={[styles.roundButton, styles.lbIconButton, { top: 8 }]}>
				<Icon name="menu" size={20} color={theme.colors.onAccent} />
			</View>
		</View>
	);
}
