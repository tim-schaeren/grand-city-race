import { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Modal,
	ScrollView,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import {
	EmailAuthProvider,
	reauthenticateWithCredential,
	signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { play } from '../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { copy } from '@grandcityrace/shared';

// Deleting the person, not the race: the server removes their account,
// profile, location history and messages in every game they were in. Their
// team's progress stays; it belongs to the team, and others are still using it.
async function eraseAccount(password: string) {
	const user = auth.currentUser;
	if (!user?.email) throw new Error('not signed in');
	// Asked again, so a phone left unlocked can't delete someone's account
	await reauthenticateWithCredential(
		user,
		EmailAuthProvider.credential(user.email, password),
	);
	await play('deleteAccount', {});
	await signOut(auth);
}

export default function DeleteAccountModal({
	visible,
	onClose,
}: {
	visible: boolean;
	onClose: () => void;
}) {
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [working, setWorking] = useState(false);
	const insets = useSafeAreaInsets();

	async function confirm() {
		if (!password || working) return;
		setWorking(true);
		setError(null);
		try {
			await eraseAccount(password);
			// The auth listener drops us back to the sign-in screen
		} catch (e: any) {
			const code = e?.code ?? '';
			setError(
				code === 'auth/wrong-password' || code === 'auth/invalid-credential'
					? copy.deleteAccount.wrongPassword
					: copy.deleteAccount.failed,
			);
			setWorking(false);
		}
	}

	return (
		<Modal
			visible={visible}
			animationType="slide"
			onRequestClose={onClose}
			transparent
		>
			<KeyboardAvoidingView
				style={styles.backdrop}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<View style={styles.sheet}>
					<ScrollView
						contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
					>
						<Text style={styles.title}>{copy.deleteAccount.title}</Text>
						<Text style={styles.body}>{copy.deleteAccount.what}</Text>
						<Text style={styles.body}>{copy.deleteAccount.team}</Text>

						<Text style={styles.label}>{copy.deleteAccount.confirm}</Text>
						<TextInput
							style={styles.input}
							value={password}
							onChangeText={t => {
								setPassword(t);
								setError(null);
							}}
							secureTextEntry
							autoCapitalize="none"
							placeholder={copy.deleteAccount.password}
							placeholderTextColor="#bbb"
						/>
						{error && <Text style={styles.error}>{error}</Text>}

						<TouchableOpacity
							style={[styles.delete, (!password || working) && styles.disabled]}
							onPress={confirm}
							disabled={!password || working}
						>
							<Text style={styles.deleteText}>
								{working ? copy.deleteAccount.deleting : copy.deleteAccount.button}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.cancel} onPress={onClose}>
							<Text style={styles.cancelText}>{copy.common.cancel}</Text>
						</TouchableOpacity>
					</ScrollView>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'flex-end',
	},
	sheet: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: '85%',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111',
		marginBottom: 12,
	},
	body: {
		fontSize: 15,
		color: '#555',
		lineHeight: 22,
		marginBottom: 12,
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		color: '#111',
		marginTop: 8,
		marginBottom: 6,
	},
	input: {
		borderWidth: 1.5,
		borderColor: '#ddd',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: '#111',
		backgroundColor: '#fafafa',
	},
	error: {
		fontSize: 13,
		color: '#ef4444',
		marginTop: 8,
	},
	delete: {
		marginTop: 20,
		paddingVertical: 15,
		borderRadius: 12,
		backgroundColor: '#ef4444',
		alignItems: 'center',
	},
	disabled: {
		opacity: 0.35,
	},
	deleteText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	cancel: {
		marginTop: 12,
		alignItems: 'center',
		paddingVertical: 10,
	},
	cancelText: {
		fontSize: 15,
		color: '#888',
	},
});
