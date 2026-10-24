// Avatar (temporary) — built for the race of 24 October 2026 and meant to be
// removed afterwards, along with everything else marked "Avatar (temporary)".
//
// A round egg button under the profile button. It shows the team's current
// avatar picture, which hosts set per team per quest. Only appears once the
// hosts have set a picture for this team.
import { useEffect, useState } from 'react';
import {
	Image,
	Modal,
	StyleSheet,
	TouchableOpacity,
	View,
	ActivityIndicator,
} from 'react-native';
import { doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { avatarPictureFor, type AvatarPictures, copy } from '@grandcityrace/shared';
import { db } from '../firebase';
import { listen } from '../utils/listen';
import Icon from '../theme/Icon';
import { useTheme } from '../theme/ThemeContext';

export default function AvatarButton({
	gameId,
	teamId,
	questOrder,
	currentQuestId,
	finished,
	top,
}: {
	gameId: string;
	teamId: string;
	questOrder: string[];
	currentQuestId: string | null;
	finished: boolean;
	top: number;
}) {
	const { colors } = useTheme();
	const insets = useSafeAreaInsets();
	const [pictures, setPictures] = useState<AvatarPictures | null>(null);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [seenUrl, setSeenUrl] = useState<string | null>(null);
	const seenKey = `avatarSeen:${gameId}:${teamId}`;

	useEffect(
		() =>
			listen(doc(db, 'games', gameId, 'avatars', teamId), (snap) =>
				setPictures(snap.exists() ? (snap.data() as AvatarPictures) : null),
			),
		[gameId, teamId],
	);

	useEffect(() => {
		AsyncStorage.getItem(seenKey)
			.then(setSeenUrl)
			.catch(() => {});
	}, [seenKey]);

	const url = avatarPictureFor(pictures, questOrder, currentQuestId, finished);
	if (!url) return null;

	// A dot until the team has looked at its newest picture
	const changed = url !== seenUrl;

	function show() {
		setLoading(true);
		setOpen(true);
		setSeenUrl(url);
		AsyncStorage.setItem(seenKey, url!).catch(() => {});
	}

	return (
		<>
			<TouchableOpacity
				style={[styles.button, { top, backgroundColor: colors.accent }]}
				onPress={show}
				accessibilityLabel={copy.avatar}
			>
				<Icon name="egg-outline" size={20} color={colors.onAccent} />
				{changed && (
					<View
						style={[
							styles.dot,
							{ backgroundColor: colors.danger, borderColor: colors.background },
						]}
					/>
				)}
			</TouchableOpacity>

			<Modal
				visible={open}
				animationType="fade"
				onRequestClose={() => setOpen(false)}
			>
				<TouchableOpacity
					activeOpacity={1}
					onPress={() => setOpen(false)}
					style={[
						styles.viewer,
						{
							backgroundColor: colors.background,
							paddingTop: insets.top + 16,
							paddingBottom: insets.bottom + 16,
						},
					]}
				>
					<Image
						source={{ uri: url }}
						style={styles.picture}
						resizeMode="contain"
						onLoadEnd={() => setLoading(false)}
					/>
					{loading && (
						<ActivityIndicator
							size="large"
							color={colors.text}
							style={StyleSheet.absoluteFill}
						/>
					)}
				</TouchableOpacity>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	button: {
		position: 'absolute',
		right: 16,
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dot: {
		position: 'absolute',
		top: 0,
		right: 0,
		width: 10,
		height: 10,
		borderRadius: 5,
		borderWidth: 1.5,
	},
	viewer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	picture: {
		flex: 1,
		width: '100%',
	},
});
