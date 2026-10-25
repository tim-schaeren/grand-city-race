import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { STORE_URL } from '../config';
import { CLIENT_VERSION, copy } from '@grandcityrace/shared';

// Keeps builds too old for today's data out of the app, before sign-in and
// during a game alike. Without the setting, or offline, everyone gets in.
export default function UpdateGate({ children }: { children: ReactNode }) {
	const [minVersion, setMinVersion] = useState(0);

	useEffect(
		() => onSnapshot(
			doc(db, 'settings', 'app'),
			snap => setMinVersion(snap.get('minClientVersion') ?? 0),
			() => {},
		),
		[],
	);

	if (CLIENT_VERSION >= minVersion) return children;

	return (
		<View style={styles.container}>
			<Text style={styles.heading}>{copy.update.heading}</Text>
			<Text style={styles.message}>{copy.update.message}</Text>
			<TouchableOpacity style={styles.button} onPress={() => Linking.openURL(STORE_URL)}>
				<Text style={styles.buttonText}>{copy.update.button}</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
		backgroundColor: '#fff',
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
		marginBottom: 48,
	},
	button: {
		backgroundColor: '#111',
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 12,
	},
	buttonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
});
