import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Linking } from 'react-native';
import { signOut } from 'firebase/auth';
import { copy } from '@grandcityrace/shared';
import { auth } from '../../firebase';
import { LEGAL } from '../../config';
import { useStyles } from './styles';

export function ProfileButton({
	name,
	top,
	onPress,
}: {
	name: string;
	top: number;
	onPress: () => void;
}) {
	const styles = useStyles();
	const initial = name ? name[0].toUpperCase() : '?';
	return (
		<TouchableOpacity
			style={[styles.roundButton, styles.profileButton, { top }]}
			onPress={onPress}
		>
			<Text style={styles.profileButtonText}>{initial}</Text>
		</TouchableOpacity>
	);
}

export function ProfileSheet({
	visible,
	name,
	onLeaveGame,
	leaving,
	onDeleteAccount,
	onReport,
	onClose,
}: {
	visible: boolean;
	name: string;
	onLeaveGame: () => void;
	leaving: boolean;
	onDeleteAccount: () => void;
	onReport: () => void;
	onClose: () => void;
}) {
	const styles = useStyles();
	const [confirmingLeave, setConfirmingLeave] = useState(false);
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={styles.sheetBackdrop}>
				<TouchableOpacity
					style={{ flex: 1 }}
					activeOpacity={1}
					onPress={onClose}
				/>
				<View style={styles.sheet}>
					<View style={styles.sheetHandle} />
					<Text style={styles.sheetName}>{name}</Text>

					{confirmingLeave ? (
						<View style={styles.sheetRow}>
							<Text style={styles.sheetConfirmText}>
								{copy.profile.leaveConfirm}
							</Text>
							<View style={styles.sheetConfirmRow}>
								<TouchableOpacity
									onPress={() => setConfirmingLeave(false)}
									style={styles.sheetCancel}
								>
									<Text style={styles.sheetCancelText}>{copy.common.cancel}</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={onLeaveGame}
									disabled={leaving}
									style={[styles.sheetLeave, leaving && { opacity: 0.4 }]}
								>
									<Text style={styles.sheetLeaveText}>
										{leaving ? copy.profile.leaving : copy.profile.leaveGame}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					) : (
						<TouchableOpacity
							style={styles.sheetRow}
							onPress={() => setConfirmingLeave(true)}
						>
							<Text style={styles.sheetRowText}>{copy.profile.leaveGame}</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						style={styles.sheetRow}
						onPress={() => signOut(auth)}
					>
						<Text style={styles.sheetRowText}>{copy.common.signOut}</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.sheetRow}
						onPress={() => Linking.openURL(LEGAL.help)}
					>
						<Text style={styles.sheetRowText}>{copy.common.howToPlay}</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.sheetRow} onPress={onReport}>
						<Text style={styles.sheetRowText}>{copy.common.reportProblem}</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.sheetRow}
						onPress={() => Linking.openURL(LEGAL.privacy)}
					>
						<Text style={styles.sheetRowText}>{copy.profile.privacy}</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.sheetRow} onPress={onDeleteAccount}>
						<Text style={styles.sheetRowDestructive}>
							{copy.common.deleteAccount}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}
