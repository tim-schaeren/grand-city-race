import { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Modal,
	useWindowDimensions,
	Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	query,
	where,
	arrayUnion,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';
import {
	gameEconomy,
	availableTeamColors,
	MAX_TEAMS_PER_GAME,
	TEAM_COLORS,
	themeFor,
	type Theme,
	copy,
} from '@grandcityrace/shared';
import { auth, db } from '../firebase';
import DeleteAccountModal from '../components/DeleteAccountModal';
import { LEGAL } from '../config';
import * as ui from '../theme/primitives';
import { listen } from '../utils/listen';
import { reportProblem } from '../utils/report';
import { removePrivateEntry } from '../utils/privateEntry';

interface PickerTeam {
	id: string;
	name: string;
	color?: string;
	memberIds?: string[];
}

export default function TeamPickerScreen({
	gameId,
}: {
	gameId: string;
}) {
	const [game, setGame] = useState<Record<string, any> | null>(null);
	const [teams, setTeams] = useState<PickerTeam[]>([]);
	const [loading, setLoading] = useState(true);
	const [newName, setNewName] = useState('');
	const [newColor, setNewColor] = useState<string | null>(null);
	const [openTeamId, setOpenTeamId] = useState<string | null>(null);
	const [players, setPlayers] = useState<Record<string, string>>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [deletingAccount, setDeletingAccount] = useState(false);
	const [pickingColor, setPickingColor] = useState(false);
	const insets = useSafeAreaInsets();

	useEffect(() => {
		return onSnapshot(doc(db, 'games', gameId), (snap) =>
			setGame(snap.exists() ? snap.data() : null),
		);
	}, [gameId]);

	useEffect(() => {
		return onSnapshot(
			query(collection(db, 'teams'), where('gameId', '==', gameId)),
			(snap) => {
				setTeams(
					snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PickerTeam),
				);
				setLoading(false);
			},
			() => setLoading(false),
		);
	}, [gameId]);

	// Who is in this game, so a team's members can be named before you join it
	useEffect(() => {
		// Right after joining, the rules may not see the membership yet: retry
		return listen(collection(db, 'games', gameId, 'players'), (snap) => {
			const names: Record<string, string> = {};
			snap.docs.forEach((d) => {
				names[d.id] =
					(d.data() as { name?: string }).name ?? copy.common.namelessPlayer;
			});
			setPlayers(names);
		});
	}, [gameId]);

	const maxTeamSize = game?.maxTeamSize ?? null;
	const gameFull = teams.length >= MAX_TEAMS_PER_GAME;
	const colorChoices = availableTeamColors(teams.map((t) => t.color ?? ''));
	const chosenColor = newColor ?? colorChoices[0] ?? TEAM_COLORS[0];
	// The first screen of the game itself, so it already wears the host's theme
	const theme = themeFor(game?.themeId);
	const styles = stylesFor(theme);

	async function joinTeam(team: PickerTeam) {
		const uid = auth.currentUser?.uid;
		if (!uid || busy) return;
		setBusy(true);
		setError(null);
		try {
			const batch = writeBatch(db);
			batch.update(doc(db, 'teams', team.id), { memberIds: arrayUnion(uid) });
			batch.update(doc(db, 'users', uid), { teamId: team.id });
			await batch.commit();
		} catch {
			setError(copy.teamPicker.joinFailed);
		} finally {
			setBusy(false);
		}
	}

	async function createTeam() {
		const uid = auth.currentUser?.uid;
		const teamName = newName.trim();
		if (!uid || !teamName || busy) return;
		setBusy(true);
		setError(null);
		try {
			const economy = gameEconomy(game as any);
			const ref = doc(collection(db, 'teams'));
			const batch = writeBatch(db);
			batch.set(ref, {
				name: teamName,
				color: chosenColor,
				gameId,
				memberIds: [uid],
				coins: economy.startingCoins,
				currentQuestId: null,
				completedQuestIds: [],
				finishedAt: null,
				questProgress: null,
			});
			batch.update(doc(db, 'users', uid), { teamId: ref.id });
			await batch.commit();
			setNewName('');
			setNewColor(null);
		} catch {
			setError(copy.teamPicker.createFailed);
		} finally {
			setBusy(false);
		}
	}

	async function leaveGame() {
		const uid = auth.currentUser?.uid;
		if (!uid || busy) return;
		setBusy(true);
		try {
			// Membership first: if the second write fails, the player is out of the
			// game's roster and the join screen will let them start over
			await deleteDoc(doc(db, 'games', gameId, 'players', uid));
			await removePrivateEntry(gameId, uid).catch(() => {});
			await updateDoc(doc(db, 'users', uid), { gameId: null, teamId: null });
		} catch {
			setError(copy.teamPicker.leaveFailed);
		} finally {
			setBusy(false);
		}
	}

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color={theme.colors.text} />
			</View>
		);
	}

	return (
		<>
		<StatusBar style={theme.dark ? 'light' : 'dark'} />
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={[
				styles.container,
				{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 },
			]}
			keyboardShouldPersistTaps="handled"
		>
			<View>
				<Text style={styles.label}>{copy.teamPicker.welcome}</Text>
				<Text style={styles.title}>{game?.name ?? copy.teamPicker.theGame}</Text>

				{teams.length > 0 && (
					<Text style={styles.section}>{copy.teamPicker.joinATeam}</Text>
				)}
				{teams.map((team) => {
					const memberIds = team.memberIds ?? [];
					const full = maxTeamSize != null && memberIds.length >= maxTeamSize;
					const open = openTeamId === team.id;
					return (
						<View key={team.id}>
							<TouchableOpacity
								style={[
									styles.teamRow,
									full && styles.teamRowFull,
									open && styles.teamRowOpen,
								]}
								onPress={() => setOpenTeamId(open ? null : team.id)}
							>
								<View
									style={[
										styles.dot,
										{ backgroundColor: team.color ?? theme.colors.accent },
									]}
								/>
								<Text style={styles.teamName}>{team.name}</Text>
								<Text style={styles.teamMeta}>
									{copy.teamPicker.members(memberIds.length, maxTeamSize, full)}
								</Text>
							</TouchableOpacity>

							{open && (
								<View style={styles.teamDetail}>
									{memberIds.length === 0 ? (
										<Text style={styles.detailEmpty}>{copy.teamPicker.nobodyHere}</Text>
									) : (
										memberIds.map((id) => (
											<Text key={id} style={styles.memberName}>
												{players[id] ?? copy.common.namelessPlayer}
											</Text>
										))
									)}
									{full ? (
										<Text style={styles.detailEmpty}>{copy.teamPicker.teamFull}</Text>
									) : (
										<TouchableOpacity
											style={[styles.joinButton, busy && styles.disabled]}
											onPress={() => joinTeam(team)}
											disabled={busy}
										>
											<Text style={styles.joinButtonText}>
												{copy.teamPicker.join(team.name)}
											</Text>
										</TouchableOpacity>
									)}
								</View>
							)}
						</View>
					);
				})}

				{gameFull ? (
					<Text style={styles.empty}>
						{copy.teamPicker.gameFull(MAX_TEAMS_PER_GAME)}
					</Text>
				) : (
					<View style={teams.length > 0 && styles.createBlock}>
						<Text style={styles.section}>
							{teams.length > 0
								? copy.teamPicker.startOwn
								: copy.teamPicker.startFirst}
						</Text>
						<View style={styles.createRow}>
							<TouchableOpacity
								style={[styles.colorButton, { backgroundColor: chosenColor }]}
								onPress={() => setPickingColor(true)}
								accessibilityLabel={copy.teamPicker.teamColour}
							/>
							<TextInput
								style={styles.input}
								value={newName}
								onChangeText={setNewName}
								placeholder={copy.teamPicker.teamName}
								placeholderTextColor={theme.colors.mutedOnSurface}
								returnKeyType="done"
								onSubmitEditing={createTeam}
							/>
						</View>

						<TouchableOpacity
							style={[
								styles.createButton,
								(!newName.trim() || busy) && styles.disabled,
							]}
							onPress={createTeam}
							disabled={!newName.trim() || busy}
						>
							<Text style={styles.createButtonText}>
								{copy.teamPicker.createTeam}
							</Text>
						</TouchableOpacity>
					</View>
				)}

				{error && <Text style={styles.error}>{error}</Text>}
			</View>

			<View style={styles.footer}>
				<TouchableOpacity onPress={leaveGame} disabled={busy} hitSlop={8}>
					<Text style={styles.leaveText}>{copy.teamPicker.leaveGame}</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={() => Linking.openURL(LEGAL.help)} hitSlop={8}>
					<Text style={styles.leaveText}>{copy.common.howToPlay}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => reportProblem({ gameId, gameName: game?.name })}
					hitSlop={8}
				>
					<Text style={styles.leaveText}>{copy.common.reportProblem}</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={() => setDeletingAccount(true)} hitSlop={8}>
					<Text style={styles.leaveText}>{copy.common.deleteAccount}</Text>
				</TouchableOpacity>
			</View>

			<ColorSheet
				visible={pickingColor}
				colors={colorChoices}
				chosen={chosenColor}
				onPick={(color) => {
					setNewColor(color);
					setPickingColor(false);
				}}
				onClose={() => setPickingColor(false)}
			/>
			<DeleteAccountModal
				visible={deletingAccount}
				onClose={() => setDeletingAccount(false)}
/>
</ScrollView>
</>
);
}

// Colours are judged on a neutral sheet rather than against the theme's
// background, which would tint every one of them
const SWATCHES_PER_ROW = 5;
const SWATCH_GAP = 14;
const SHEET_PADDING = 24;

function ColorSheet({
	visible,
	colors,
	chosen,
	onPick,
	onClose,
}: {
	visible: boolean;
	colors: string[];
	chosen: string;
	onPick: (color: string) => void;
	onClose: () => void;
}) {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	// Fixed sizes from the screen width: percentage widths in a wrapping row
	// are measured wrongly and collapse the grid to a single row
	const size = Math.floor(
		(width - SHEET_PADDING * 2 - SWATCH_GAP * (SWATCHES_PER_ROW - 1)) /
			SWATCHES_PER_ROW,
	);
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={sheet.backdrop}>
				<TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
				<View style={[sheet.panel, { paddingBottom: insets.bottom + SHEET_PADDING }]}>
					<Text style={sheet.title}>{copy.teamPicker.teamColour}</Text>
					<View style={sheet.grid}>
						{colors.map((color) => (
							<TouchableOpacity
								key={color}
								onPress={() => onPick(color)}
								accessibilityLabel={
									color === chosen ? copy.teamPicker.chosenColour : copy.teamPicker.colour
								}
								style={[
									sheet.ring,
									{ width: size, height: size, borderRadius: size / 2 },
									chosen === color && sheet.ringChosen,
								]}
							>
								<View
									style={{
										flex: 1,
										borderRadius: size / 2,
										backgroundColor: color,
									}}
								/>
							</TouchableOpacity>
						))}
					</View>
				</View>
			</View>
		</Modal>
	);
}

const sheet = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	panel: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: SHEET_PADDING,
		paddingTop: SHEET_PADDING,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111111',
		marginBottom: 20,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: SWATCH_GAP,
	},
	// The chosen colour gets a ring around it, with a white gap between
	ring: {
		padding: 4,
		borderWidth: 3,
		borderColor: 'transparent',
	},
	ringChosen: {
		borderColor: '#111111',
	},
});

function makeStyles(t: Theme) {
	const c = t.colors;
	const retroEdge = t.shape.shadowOffset > 0;
	return StyleSheet.create({
		center: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: c.background,
		},
		scroll: {
			flex: 1,
			backgroundColor: c.background,
		},
		// Content at the top, account actions pinned to the bottom
		container: {
			flexGrow: 1,
			justifyContent: 'space-between',
			paddingHorizontal: 24,
		},
		label: {
			...ui.label(t),
			textAlign: 'center',
		},
		title: {
			...ui.heading(t, 42),
			textAlign: 'center',
			marginTop: 8,
			marginBottom: 36,
		},
		section: {
			...ui.label(t),
			fontSize: 15,
			letterSpacing: 2,
			color: c.text,
			marginBottom: 12,
		},
		teamRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 14,
			borderWidth: t.shape.borderWidth,
			borderColor: c.border,
			backgroundColor: retroEdge ? c.surface : c.background,
			borderRadius: t.shape.radius,
			paddingHorizontal: 18,
			paddingVertical: 18,
			marginBottom: 10,
		},
		teamRowFull: {
			opacity: 0.4,
		},
		dot: {
			width: 18,
			height: 18,
			borderRadius: 9,
			borderWidth: retroEdge ? 2 : 0,
			borderColor: c.border,
		},
		teamName: {
			flex: 1,
			fontSize: 18,
			fontWeight: '600',
			color: retroEdge ? c.onSurface : c.text,
		},
		teamMeta: {
			fontSize: 15,
			color: retroEdge ? c.mutedOnSurface : c.muted,
		},
		empty: {
			fontSize: 16,
			color: c.muted,
			textAlign: 'center',
			marginTop: 16,
		},
		teamRowOpen: {
			borderColor: c.accent,
			...(retroEdge
				? {
						borderRightWidth: t.shape.borderWidth + t.shape.shadowOffset,
						borderBottomWidth: t.shape.borderWidth + t.shape.shadowOffset,
					}
				: null),
		},
		teamDetail: {
			borderLeftWidth: retroEdge ? t.shape.borderWidth : 2,
			borderLeftColor: c.border,
			marginLeft: 8,
			paddingLeft: 14,
			paddingBottom: 14,
			marginTop: -4,
			marginBottom: 10,
		},
		memberName: {
			fontSize: 17,
			color: c.text,
			paddingVertical: 4,
		},
		detailEmpty: {
			fontSize: 16,
			color: c.muted,
			paddingVertical: 4,
		},
		joinButton: {
			...ui.button(t),
			marginTop: 12,
			paddingVertical: 14,
		},
		joinButtonText: {
			...ui.buttonText(t),
			fontSize: 17,
		},
		createBlock: {
			marginTop: 28,
		},
		createRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12,
		},
		// The chosen colour; tapping it opens the picker
		colorButton: {
			width: 54,
			height: 54,
			borderRadius: 27,
			borderWidth: retroEdge ? t.shape.borderWidth : 0,
			borderColor: c.border,
		},
		input: {
			...ui.input(t),
			flex: 1,
			paddingHorizontal: 16,
			paddingVertical: 15,
			fontSize: 18,
		},
		createButton: {
			...ui.button(t),
			marginTop: 14,
			paddingVertical: 16,
		},
		createButtonText: {
			...ui.buttonText(t),
			fontSize: 17,
		},
		disabled: {
			opacity: 0.35,
		},
		error: {
			fontSize: 15,
			fontWeight: '600',
			color: c.danger,
			backgroundColor: c.surface,
			borderRadius: t.shape.radius,
			overflow: 'hidden',
			paddingHorizontal: 12,
			paddingVertical: 8,
			marginTop: 14,
			textAlign: 'center',
		},
		footer: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			justifyContent: 'center',
			columnGap: 24,
			rowGap: 12,
			marginTop: 48,
		},
		leaveText: {
			fontSize: 15,
			color: c.muted,
		},
	});
}

const styleCache = new Map<string, ReturnType<typeof makeStyles>>();

function stylesFor(t: Theme) {
	let styles = styleCache.get(t.id);
	if (!styles) {
		styles = makeStyles(t);
		styleCache.set(t.id, styles);
	}
	return styles;
}
