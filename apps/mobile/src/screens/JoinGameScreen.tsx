import { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	Linking,
} from 'react-native';
import { signOut } from 'firebase/auth';
import {
	collection,
	doc,
	getDocs,
	limit,
	query,
	where,
	writeBatch,
} from 'firebase/firestore';
import {
	JOIN_CODE_LENGTH,
	normalizeJoinCode,
	isValidJoinCode,
	copy,
} from '@grandcityrace/shared';
import { auth, db } from '../firebase';
import DeleteAccountModal from '../components/DeleteAccountModal';
import { LEGAL } from '../config';

export default function JoinGameScreen({ name }: { name: string }) {
	const [deleting, setDeleting] = useState(false);
	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [joining, setJoining] = useState(false);

	const ready = isValidJoinCode(code);

	async function join() {
		if (!ready || joining) return;
		const uid = auth.currentUser?.uid;
		if (!uid) return;
		setJoining(true);
		setError(null);
		try {
			const found = await getDocs(
				query(collection(db, 'games'), where('joinCode', '==', code), limit(1)),
			);
			if (found.empty) {
				setError(copy.join.noGame);
				return;
			}
			const game = found.docs[0];
			if (game.data().endedAt) {
				setError(copy.join.finished);
				return;
			}

			// The membership document is what lets this player pick a team, and
			// what lets the host see them without reading every user on the platform
			const batch = writeBatch(db);
			batch.set(doc(db, 'games', game.id, 'players', uid), {
				id: uid,
				name,
				joinedAt: Date.now(),
			});
			batch.update(doc(db, 'users', uid), { gameId: game.id });
			await batch.commit();
		} catch {
			setError(copy.join.failed);
		} finally {
			setJoining(false);
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<Text style={styles.title}>{copy.join.title}</Text>
			<Text style={styles.message}>{copy.join.intro}</Text>

			<TextInput
				style={[styles.codeInput, error ? styles.codeInputError : null]}
				value={code}
				onChangeText={t => {
					setCode(normalizeJoinCode(t));
					setError(null);
				}}
				placeholder={'•'.repeat(JOIN_CODE_LENGTH)}
				placeholderTextColor="#d1d5db"
				autoCapitalize="characters"
				autoCorrect={false}
				maxLength={JOIN_CODE_LENGTH}
				returnKeyType="go"
				onSubmitEditing={join}
			/>

			{error && <Text style={styles.error}>{error}</Text>}

			<TouchableOpacity
				style={[styles.button, (!ready || joining) && styles.buttonDisabled]}
				onPress={join}
				disabled={!ready || joining}
			>
				{joining ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.buttonText}>{copy.join.button}</Text>
				)}
			</TouchableOpacity>

			<View style={styles.accountRow}>
				<TouchableOpacity onPress={() => Linking.openURL(LEGAL.help)}>
					<Text style={styles.signOutText}>{copy.common.howToPlay}</Text>
				</TouchableOpacity>
				<Text style={styles.signOutText}>·</Text>
				<TouchableOpacity onPress={() => signOut(auth)}>
					<Text style={styles.signOutText}>{copy.common.signOut}</Text>
				</TouchableOpacity>
				<Text style={styles.signOutText}>·</Text>
				<TouchableOpacity onPress={() => setDeleting(true)}>
					<Text style={styles.signOutText}>{copy.common.deleteAccount}</Text>
				</TouchableOpacity>
			</View>

			<DeleteAccountModal
				visible={deleting}
				onClose={() => setDeleting(false)}
			/>
		</KeyboardAvoidingView>
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
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#111',
		marginBottom: 8,
	},
	message: {
		fontSize: 15,
		color: '#888',
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 28,
	},
	codeInput: {
		width: '100%',
		borderWidth: 1.5,
		borderColor: '#ddd',
		borderRadius: 12,
		paddingVertical: 16,
		fontSize: 30,
		fontWeight: '700',
		letterSpacing: 8,
		textAlign: 'center',
		color: '#111',
		backgroundColor: '#fafafa',
	},
	codeInputError: {
		borderColor: '#f87171',
		backgroundColor: '#fff5f5',
	},
	error: {
		fontSize: 13,
		color: '#ef4444',
		marginTop: 10,
		textAlign: 'center',
	},
	button: {
		width: '100%',
		marginTop: 20,
		paddingVertical: 16,
		borderRadius: 12,
		backgroundColor: '#111',
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.35,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	accountRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginTop: 28,
	},
	signOutText: {
		fontSize: 14,
		color: '#aaa',
	},
});
