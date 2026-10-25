import {
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	Linking,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useUser } from '../hooks/useUser';
import GameScreen from './game/GameScreen';
import JoinGameScreen from './JoinGameScreen';
import TeamPickerScreen from './TeamPickerScreen';
import { copy } from '@grandcityrace/shared';

const ADMIN_URL = 'https://grand-city-race.com';

export default function HomeScreen() {
	const { profile, loading } = useUser();

	if (loading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	// Three states on the way into a race: no game, joined but teamless, playing
	if (profile?.teamId) {
		return <GameScreen teamId={profile.teamId} />;
	}

	if (profile?.gameId) {
		return <TeamPickerScreen gameId={profile.gameId} />;
	}

	if (profile?.isAdmin) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{copy.adminHome.title}</Text>
				<Text style={styles.heading}>{copy.adminHome.heading}</Text>
				<Text style={styles.message}>{copy.adminHome.message}</Text>
				<TouchableOpacity
					style={styles.adminButton}
					onPress={() => Linking.openURL(ADMIN_URL)}
				>
					<Text style={styles.adminButtonText}>{copy.adminHome.open}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.signOutButton}
					onPress={() => signOut(auth)}
				>
					<Text style={styles.signOutText}>{copy.adminHome.signOut}</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return <JoinGameScreen name={profile?.name ?? copy.common.namelessPlayer} />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 36,
		fontWeight: '700',
		letterSpacing: 4,
		marginBottom: 24,
	},
	heading: {
		fontSize: 22,
		fontWeight: '600',
		color: '#111',
		marginBottom: 12,
		textAlign: 'center',
	},
	message: {
		fontSize: 16,
		color: '#888',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 64,
	},
	adminButton: {
		backgroundColor: '#111',
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 12,
		marginBottom: 48,
	},
	adminButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	signOutButton: {
		padding: 12,
	},
	signOutText: {
		color: '#aaa',
		fontSize: 14,
	},
});
