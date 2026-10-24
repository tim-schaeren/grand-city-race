import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import {
	View,
	Text,
	TextInput,
	Linking,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	Modal,
	Animated,
	Easing,
	ScrollView,
	Keyboard,
	useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { signOut } from 'firebase/auth';
import { useUser } from '../hooks/useUser';
import {
	doc,
	collection,
	onSnapshot,
	deleteDoc,
	updateDoc,
	addDoc,
	arrayUnion,
	query,
	where,
	documentId,
	writeBatch,
	orderBy,
	limit,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	normalizeQuest,
	gameEconomy,
	shopConfig,
	compassMsLeft as compassMsLeftFor,
	radarMsLeft as radarMsLeftFor,
	curseMsLeft,
	SHOP_ITEMS_BY_TYPE,
	type ShopItemType,
	teamCoins,
	hintsRevealedFor,
	formatActivity,
	formatActivityTime,
	isNewsFor,
	questSolvedId,
	teamFinishedId,
	hintRevealedId,
	type Quest,
	type QuestProgress,
	type ActivityEntry,
	type ChatMessage,
	type QuestHint,
	type Theme,
	themeFor,
	raceTimeMs,
	copy,
} from '@grandcityrace/shared';
import { db, auth } from '../firebase';
import {
	TASK_NAME as LOCATION_TASK,
	stopBackgroundTracking,
} from '../tasks/locationTask';
import {
	startTracking,
	stopTracking,
	recordPosition,
} from '../tasks/distanceTracker';
import { distanceMeters, bearingDegrees } from '../utils/geo';
import { listen } from '../utils/listen';
import { reportProblem } from '../utils/report';
import { requestPushToken } from '../utils/pushToken';
import {
	savePosition,
	savePushToken,
	removePrivateEntry,
	scrubPlayerListEntry,
} from '../utils/privateEntry';
import ContentBlocks from '../components/ContentBlocks';
import RecapModal from '../components/RecapModal';
import ShopSheet from '../components/ShopSheet';
import DeleteAccountModal from '../components/DeleteAccountModal';
import PermissionsIntro from '../components/PermissionsIntro';
import AvatarButton from '../components/Avatar'; // Avatar (temporary)
import Radar from '../components/Radar';
import { callApi } from '../utils/api';
import { LEGAL } from '../config';
import Icon from '../theme/Icon';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import * as ui from '../theme/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
	id: string;
	gameId: string;
	name: string;
	memberIds: string[];
	currentQuestId: string | null;
	completedQuestIds: string[];
	finishedAt: number | null;
	pausedMsAtFinish?: number;
	questProgress?: QuestProgress | null;
	coins?: number;
	hintsRevealed?: Record<string, number>;
	teamChatReadAt?: number;
	hostChatReadAt?: number;
	color?: string;
	activeCompassUntil?: number;
	activeRadarUntil?: number;
	shields?: number;
	cursedUntil?: number;
	cursedByName?: string;
}

interface Game {
	id: string;
	name: string;
	startDateTime: number;
	questOrder: string[];
	maxTeamSpreadMeters: number | null;
	pausedAt: number | null;
	totalPausedMs: number;
	endedAt: number | null;
	startingCoins?: number;
	coinsPerQuest?: number;
	hintCost?: number;
	hotlineNumber?: string;
	themeId?: string;
	recapPublishedAt?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Distance progress is pushed to the team doc at most once per this many meters
const DISTANCE_SYNC_STEP_METERS = 20;

// How far each new compass reading moves the arrow on Android (0–1): low
// enough to calm a jittery magnetometer, high enough to follow a turn
const HEADING_SMOOTHING = 0.2;

function formatDuration(ms: number): string {
	if (!ms || ms <= 0) return '—';
	const h = Math.floor(ms / 3600000);
	const m = Math.floor((ms % 3600000) / 60000);
	const s = Math.floor((ms % 60000) / 1000);
	return copy.common.duration(h, m, s);
}


function formatCountdown(ms: number): string {
	if (ms <= 0) return '00:00:00';
	const h = Math.floor(ms / 3600000);
	const m = Math.floor((ms % 3600000) / 60000);
	const s = Math.floor((ms % 60000) / 1000);
	return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

type SheetTab = 'activity' | 'chat' | 'leaderboard';

// Box widths as a share of the font size. Each character sits in a box of
// its own: the display fonts have no fixed-width digits, so a "1" would
// otherwise be narrower than an "8" and the clock would wobble every second.
const DIGIT_WIDTH = 0.66;
const COLON_WIDTH = 0.32;

// A clock that keeps its size: the font size comes from the screen width
// once, rather than being re-fitted to every new reading
function Countdown({ ms }: { ms: number }) {
	const styles = useStyles();
	const { fonts } = useTheme();
	const { width } = useWindowDimensions();
	const text = formatCountdown(ms);
	const units = 6 * DIGIT_WIDTH + 2 * COLON_WIDTH;
	const fontSize = Math.min(72, Math.floor((width - 64) / units));
	return (
		<View style={styles.countdownRow}>
			{text.split('').map((char, i) => (
				<Text
					key={i}
					style={[
						styles.countdown,
						{
							fontSize: fontSize * fonts.scale,
							lineHeight: Math.round(fontSize * 1.2),
							width: fontSize * (char === ':' ? COLON_WIDTH : DIGIT_WIDTH),
						},
					]}
				>
					{char}
				</Text>
			))}
		</View>
	);
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function WaitingView({ game, now }: { game: Game; now: number }) {
	const styles = useStyles();
	const ms = game.startDateTime - now;
	return (
		<View style={styles.container}>
			<Text style={styles.label}>{copy.waiting.getReady}</Text>
			<Text style={styles.gameName}>{game.name}</Text>
			<Text style={styles.countdownLabel}>{copy.waiting.startsIn}</Text>
			<Countdown ms={ms} />
		</View>
	);
}

function ScrollContainer({ children }: { children: ReactNode }) {
	const styles = useStyles();
	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
		>
			{children}
		</ScrollView>
	);
}

function CompassArrow({
	bearing,
	heading,
	uncalibrated,
	distance,
	msLeft,
}: {
	bearing: number;
	heading: number | null;
	uncalibrated: boolean;
	distance: number | null;
	msLeft: number;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	// With a device heading the arrow points the real way; without one it still
	// shows the bearing, just relative to north
	const rotation = heading === null ? bearing : bearing - heading;
	// The angle keeps counting past 360 so the arrow always turns the shorter
	// way. Android glides between readings; iOS readings are already smooth.
	const angle = useRef(new Animated.Value(rotation)).current;
	const lastAngle = useRef(rotation);
	useEffect(() => {
		const delta = ((((rotation - lastAngle.current) % 360) + 540) % 360) - 180;
		const next = lastAngle.current + delta;
		lastAngle.current = next;
		if (Platform.OS === 'android') {
			Animated.timing(angle, {
				toValue: next,
				duration: 200,
				easing: Easing.out(Easing.quad),
				useNativeDriver: true,
			}).start();
		} else {
			angle.setValue(next);
		}
	}, [rotation]);
	const rotate = angle.interpolate({
		inputRange: [-360, 360],
		outputRange: ['-360deg', '360deg'],
	});
	const total = Math.ceil(msLeft / 1000);
	const left = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
	return (
		<View style={styles.compassWrap}>
			<View style={styles.compassDial}>
				<Animated.View style={{ transform: [{ rotate }] }}>
					<Icon name="navigation" size={48} color={colors.accent} />
				</Animated.View>
			</View>
			{distance !== null && (
				<Text style={styles.compassDistance}>
					{copy.common.metersAway(Math.round(distance))}
				</Text>
			)}
			<Text style={styles.compassMeta}>
				{copy.compass.meta(heading === null, left)}
			</Text>
			{uncalibrated && (
				<Text style={styles.compassHint}>{copy.compass.calibrate}</Text>
			)}
		</View>
	);
}

function NavigationView({
	quest,
	distance,
	bearing,
	heading,
	headingUncalibrated,
	compassMsLeft,
	radarMsLeft,
}: {
	quest: Quest;
	headingUncalibrated: boolean;
	radarMsLeft: number;
	distance: number | null;
	bearing: number | null;
	heading: number | null;
	compassMsLeft: number;
}) {
	const styles = useStyles();
	return (
		<ScrollContainer>
			<Text style={styles.label}>{copy.navigation.findNext}</Text>
			<View style={styles.hintPanel}>
				<ContentBlocks
					blocks={quest.navigationHint}
					textStyle={styles.navigationHint}
				/>
			</View>
			{compassMsLeft > 0 && bearing !== null && (
				<CompassArrow
					bearing={bearing}
					heading={heading}
					uncalibrated={headingUncalibrated}
					distance={distance}
					msLeft={compassMsLeft}
				/>
			)}
			{/* The compass says more, so the radar steps aside while both run */}
			{radarMsLeft > 0 && compassMsLeft <= 0 && (
				<Radar distance={distance} msLeft={radarMsLeft} />
			)}
		</ScrollContainer>
	);
}

function DistanceView({ quest, meters }: { quest: Quest; meters: number }) {
	const styles = useStyles();
	const target = quest.distanceMeters ?? 0;
	const fraction = target > 0 ? Math.min(meters / target, 1) : 1;
	return (
		<ScrollContainer>
			<Text style={styles.label}>{copy.navigation.keepMoving}</Text>
			{quest.navigationHint.length > 0 && (
				<View style={styles.hintPanel}>
					<ContentBlocks
						blocks={quest.navigationHint}
						textStyle={styles.navigationHint}
					/>
				</View>
			)}
			{quest.showDistanceProgress !== false && (
				<>
					<View style={styles.progressTrack}>
						<View
							style={[styles.progressFill, { width: `${fraction * 100}%` }]}
						/>
					</View>
					<Text style={styles.distance}>
						{copy.navigation.walked(
							Math.round(Math.min(meters, target)),
							Math.round(target),
						)}
					</Text>
				</>
			)}
		</ScrollContainer>
	);
}

function QuestHeader({
	quest,
	questNumber,
	totalQuests,
}: {
	quest: Quest;
	questNumber: number;
	totalQuests: number;
}) {
	const styles = useStyles();
	return (
		<>
			<Text style={styles.questNumber}>
				{copy.quest.number(questNumber, totalQuests)}
			</Text>
			<Text style={styles.questTitle}>{quest.title}</Text>
			<ContentBlocks
				blocks={quest.description}
				textStyle={styles.questDescription}
			/>
		</>
	);
}

function ContinueButton({
	disabled,
	label,
	onPress,
}: {
	disabled: boolean;
	label: string;
	onPress: () => void;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	return (
		<TouchableOpacity
			style={[styles.continueButton, disabled && styles.submitButtonDisabled]}
			onPress={onPress}
			disabled={disabled}
		>
			<Text style={styles.continueButtonText}>{label}</Text>
			<Icon name="arrow-right" size={20} color={colors.onAccent} />
		</TouchableOpacity>
	);
}

function TimerView({
	quest,
	questNumber,
	totalQuests,
	remainingMs,
	submitting,
	onContinue,
}: {
	quest: Quest;
	questNumber: number;
	totalQuests: number;
	remainingMs: number;
	submitting: boolean;
	onContinue: () => void;
}) {
	const styles = useStyles();
	const done = remainingMs <= 0;
	return (
		<ScrollContainer>
			<QuestHeader
				quest={quest}
				questNumber={questNumber}
				totalQuests={totalQuests}
			/>
			<Text style={styles.countdownLabel}>
				{done ? copy.quest.timeUp : copy.quest.continueIn}
			</Text>
			<View style={styles.timerCountdown}>
				<Countdown ms={remainingMs} />
			</View>
			<ContinueButton
				disabled={!done || submitting}
				label={copy.quest.continue}
				onPress={onContinue}
			/>
		</ScrollContainer>
	);
}

function InfoView({
	quest,
	questNumber,
	totalQuests,
	submitting,
	onContinue,
}: {
	quest: Quest;
	questNumber: number;
	totalQuests: number;
	submitting: boolean;
	onContinue: () => void;
}) {
	const styles = useStyles();
	return (
		<ScrollContainer>
			<QuestHeader
				quest={quest}
				questNumber={questNumber}
				totalQuests={totalQuests}
			/>
			<ContinueButton
				disabled={submitting}
				label={copy.quest.continue}
				onPress={onContinue}
			/>
		</ScrollContainer>
	);
}

function HintSection({
	hints,
	revealed,
	cost,
	coins,
	onReveal,
}: {
	hints: QuestHint[];
	revealed: number;
	cost: number;
	coins: number;
	onReveal: () => void;
}) {
	const styles = useStyles();
	if (!hints.length) return null;
	const allRevealed = revealed >= hints.length;
	const affordable = coins >= cost;
	return (
		<View style={styles.hintSection}>
			{hints.slice(0, revealed).map((hint, i) => (
				<View key={i} style={styles.hintCard}>
					<Text style={styles.hintLabel}>{copy.hints.label(i + 1)}</Text>
					<ContentBlocks blocks={hint.blocks} textStyle={styles.hintText} />
				</View>
			))}
			{!allRevealed && (
				<TouchableOpacity
					style={[
						styles.hintButton,
						!affordable && styles.submitButtonDisabled,
					]}
					onPress={onReveal}
					disabled={!affordable}
				>
					<Text style={styles.hintButtonText}>
						{affordable
							? copy.hints.reveal(revealed > 0, cost)
							: copy.hints.notEnough(cost)}
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

function QuestView({
	quest,
	questNumber,
	totalQuests,
	answer,
	setAnswer,
	wrong,
	submitting,
	onSubmit,
	hintsRevealed,
	hintCost,
	coins,
	onRevealHint,
}: {
	quest: Quest;
	questNumber: number;
	totalQuests: number;
	answer: string;
	setAnswer: (v: string) => void;
	wrong: boolean;
	submitting: boolean;
	onSubmit: () => void;
	hintsRevealed: number;
	hintCost: number;
	coins: number;
	onRevealHint: () => void;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
		>
			<ScrollContainer>
				<QuestHeader
					quest={quest}
					questNumber={questNumber}
					totalQuests={totalQuests}
				/>

				<View style={styles.answerRow}>
					<TextInput
						style={[styles.answerInput, wrong && styles.answerInputWrong]}
						value={answer}
						onChangeText={setAnswer}
						placeholder={copy.quest.answer}
						placeholderTextColor={colors.mutedOnSurface}
						autoCorrect={false}
						autoCapitalize="none"
						returnKeyType="done"
						onSubmitEditing={onSubmit}
					/>
					<TouchableOpacity
						style={[
							styles.submitButton,
							submitting && styles.submitButtonDisabled,
						]}
						onPress={onSubmit}
						disabled={submitting}
					>
						<Icon name="arrow-right" size={22} color={colors.onAccent} />
					</TouchableOpacity>
				</View>

				{wrong && (
					<Text style={styles.wrongText}>{copy.quest.wrong}</Text>
				)}

				<HintSection
					hints={quest.hints ?? []}
					revealed={hintsRevealed}
					cost={hintCost}
					coins={coins}
					onReveal={onRevealHint}
				/>
			</ScrollContainer>
		</KeyboardAvoidingView>
	);
}

function FinishedView({
	game,
	team,
	allTeams,
	onLeaderboard,
}: {
	game: Game;
	team: Team;
	allTeams: Team[];
	onLeaderboard: () => void;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	const rank = allTeams.filter(
		(t) => t.finishedAt && t.finishedAt <= (team.finishedAt ?? 0),
	).length;
	const duration = raceTimeMs(team, game) ?? 0;
	return (
		<View style={styles.container}>
			<View style={styles.finishedIcon}>
				<Icon name="flag-checkered" size={72} color={colors.text} />
			</View>
			<Text style={styles.finishedHeading}>{copy.finished.heading}</Text>
			<Text style={styles.finishedPlacement}>
				{copy.finished.placement(rank)}
			</Text>
			<Text style={styles.finishedSub}>{formatDuration(duration)}</Text>
			<TouchableOpacity
				style={styles.leaderboardButton}
				onPress={onLeaderboard}
			>
				<Text style={styles.leaderboardButtonText}>
					{copy.finished.seeLeaderboard}
				</Text>
				<Icon name="arrow-right" size={18} color={colors.text} />
			</TouchableOpacity>
		</View>
	);
}

function PausedView() {
	const styles = useStyles();
	const { colors } = useTheme();
	return (
		<View style={styles.container}>
			<View style={styles.finishedIcon}>
				<Icon name="pause-circle-outline" size={96} color={colors.text} />
			</View>
			<Text style={styles.finishedHeading}>{copy.paused.heading}</Text>
			<Text style={styles.message}>{copy.paused.message}</Text>
		</View>
	);
}

function EndedView({ game, teamId }: { game: Game; teamId: string | null }) {
	const styles = useStyles();
	const { colors } = useTheme();
	const [recapOpen, setRecapOpen] = useState(false);
	return (
		<View style={styles.container}>
			<View style={styles.finishedIcon}>
				<Icon name="flag-checkered" size={72} color={colors.text} />
			</View>
			<Text style={styles.finishedHeading}>{copy.ended.heading}</Text>
			<Text style={styles.finishedSub}>{copy.ended.thanks}</Text>
			{/* The hosts decide when the recap is ready */}
			{!!game.recapPublishedAt && (
				<>
					<TouchableOpacity style={styles.recapButton} onPress={() => setRecapOpen(true)}>
						<Text style={styles.recapButtonText}>{copy.recap.open}</Text>
						<Icon name="arrow-right" size={18} color={colors.onAccent} />
					</TouchableOpacity>
					<RecapModal
						gameId={game.id}
						themeId={game.themeId}
						teamId={teamId}
						visible={recapOpen}
						onClose={() => setRecapOpen(false)}
					/>
				</>
			)}
		</View>
	);
}

function ActivityList({
	entries,
	viewerTeamId,
	highlightSince,
}: {
	entries: ActivityEntry[];
	viewerTeamId: string;
	highlightSince: number;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	if (!entries.length) {
		return (
			<Text style={[styles.message, { marginTop: 32 }]}>
				{copy.activity.empty}
			</Text>
		);
	}
	return (
		<>
			{entries.map((entry) => {
				const { icon, text } = formatActivity(entry, viewerTeamId);
				// A team's own actions aren't news to them, but what a host did to them is
				const isNew =
					isNewsFor(entry, viewerTeamId) && entry.at > highlightSince;
				return (
					<View
						key={entry.id}
						style={[styles.activityRow, isNew && styles.activityRowNew]}
					>
						<View style={styles.activityBadge}>
							<Icon name={icon} size={18} color={colors.onAccent} />
						</View>
						<View style={{ flex: 1 }}>
							<Text
								style={[styles.activityText, isNew && styles.activityTextNew]}
							>
								{text}
							</Text>
							<View style={styles.activityMeta}>
								<Text style={styles.activityTime}>
									{formatActivityTime(entry.at)}
								</Text>
								{entry.visibility === 'team' && (
									<>
										<Icon name="lock-outline" size={12} color={colors.muted} />
										<Text style={styles.activityTime}>
											{copy.activity.onlyYourTeam}
										</Text>
									</>
								)}
							</View>
						</View>
						{isNew && <View style={styles.newDot} />}
					</View>
				);
			})}
		</>
	);
}

function HotlineBar({ number }: { number: string }) {
	const styles = useStyles();
	return (
		<TouchableOpacity
			style={styles.hotlineBar}
			onPress={() => Linking.openURL(`tel:${number}`)}
		>
			<Text style={styles.hotlineBarText}>
				{copy.chat.somethingWrong}{' '}
				<Text style={styles.hotlineBarLink}>{copy.chat.callHosts}</Text>
			</Text>
		</TouchableOpacity>
	);
}

function ChatView({
	messages,
	draft,
	setDraft,
	onSend,
	sending,
	hotlineNumber,
	teamReadAt,
	hostReadAt,
}: {
	messages: ChatMessage[];
	draft: string;
	setDraft: (v: string) => void;
	onSend: () => void;
	sending: boolean;
	hotlineNumber?: string;
	teamReadAt: number;
	hostReadAt: number;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	const scrollRef = useRef<ScrollView>(null);

	// Keep the newest message in view, including when one arrives while reading
	useEffect(() => {
		const id = setTimeout(
			() => scrollRef.current?.scrollToEnd({ animated: true }),
			50,
		);
		return () => clearTimeout(id);
	}, [messages.length]);

	// "Seen" belongs on the last message of each side only, or the thread turns into noise
	const lastMine = [...messages].reverse().find((m) => !m.fromHost);
	const lastTheirs = [...messages].reverse().find((m) => m.fromHost);

	const insets = useSafeAreaInsets();
	const [keyboardUp, setKeyboardUp] = useState(false);

	// The keyboard already lifts the bar, so the home-indicator inset would
	// otherwise leave a gap above it
	useEffect(() => {
		const show = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
			() => setKeyboardUp(true),
		);
		const hide = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
			() => setKeyboardUp(false),
		);
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);

	return (
		<View style={styles.chatWrap}>
			{hotlineNumber ? <HotlineBar number={hotlineNumber} /> : null}
			<ScrollView
				ref={scrollRef}
				style={{ flex: 1 }}
				contentContainerStyle={styles.chatMessages}
				keyboardShouldPersistTaps="handled"
			>
				{messages.length === 0 && (
					<Text style={[styles.message, { marginVertical: 24 }]}>
						{copy.chat.empty}
					</Text>
				)}

				{messages.map((m) => {
					const seen = m.fromHost
						? m.id === lastTheirs?.id && teamReadAt >= m.sentAt
						: m.id === lastMine?.id && hostReadAt >= m.sentAt;
					return (
						<View key={m.id}>
							<View
								style={[
									styles.bubbleRow,
									m.fromHost ? styles.bubbleRowLeft : styles.bubbleRowRight,
								]}
							>
								<View
									style={[
										styles.bubble,
										m.fromHost ? styles.bubbleHost : styles.bubbleMine,
									]}
								>
									<Text
										style={
											m.fromHost ? styles.bubbleTextHost : styles.bubbleTextMine
										}
									>
										{m.text}
									</Text>
									<Text
										style={
											m.fromHost ? styles.bubbleMetaHost : styles.bubbleMetaMine
										}
									>
										{m.fromHost ? copy.chat.hosts : m.authorName} ·{' '}
										{formatActivityTime(m.sentAt)}
									</Text>
								</View>
							</View>
							{seen && (
								<Text
									style={[
										styles.seenLabel,
										m.fromHost ? styles.seenLabelLeft : styles.seenLabelRight,
									]}
								>
									{copy.chat.seen}
</Text>
							)}
						</View>
					);
				})}
			</ScrollView>

			<View
				style={[
					styles.chatInputRow,
					{ paddingBottom: keyboardUp ? 12 : Math.max(insets.bottom, 12) },
				]}
			>
				<TextInput
					style={[styles.answerInput, styles.chatInput]}
					value={draft}
					onChangeText={setDraft}
					placeholder={copy.chat.placeholder}
					placeholderTextColor={colors.mutedOnSurface}
					multiline
				/>
				<TouchableOpacity
					style={[
						styles.submitButton,
						(sending || !draft.trim()) && styles.submitButtonDisabled,
					]}
					onPress={onSend}
					disabled={sending || !draft.trim()}
				>
					<Icon name="arrow-right" size={22} color={colors.onAccent} />
				</TouchableOpacity>
			</View>
		</View>
	);
}

function LeaderboardModal({
	visible,
	onClose,
	game,
	allTeams,
	currentTeamId,
	activity,
	tab,
	onTabChange,
	highlightSince,
	messages,
	chatUnread,
	draft,
	setDraft,
	onSend,
	sending,
	teamReadAt,
	hostReadAt,
}: {
	visible: boolean;
	onClose: () => void;
	game: Game;
	allTeams: Team[];
	currentTeamId: string;
	activity: ActivityEntry[];
	tab: SheetTab;
	onTabChange: (tab: SheetTab) => void;
	highlightSince: number;
	messages: ChatMessage[];
	chatUnread: number;
	draft: string;
	setDraft: (v: string) => void;
	onSend: () => void;
	sending: boolean;
	teamReadAt: number;
	hostReadAt: number;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	const insets = useSafeAreaInsets();
	const sorted = [...allTeams].sort((a, b) => {
		if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
		if (a.finishedAt) return -1;
		if (b.finishedAt) return 1;
		return (
			(b.completedQuestIds?.length ?? 0) - (a.completedQuestIds?.length ?? 0)
		);
	});
	const totalQuests = game.questOrder.length;

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<KeyboardAvoidingView
				style={styles.modal}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<View style={[styles.lbHeader, { paddingTop: insets.top + 12 }]}>
					<View style={styles.tabRow}>
						{(['activity', 'chat', 'leaderboard'] as const).map((name) => (
							<TouchableOpacity key={name} onPress={() => onTabChange(name)}>
								<Text
									style={tab === name ? styles.tabLabelActive : styles.tabLabel}
								>
									{name === 'activity'
										? copy.tabs.activity
										: name === 'chat'
											? copy.tabs.chat
											: copy.tabs.board}
									{name === 'chat' && chatUnread > 0 ? copy.tabs.unread(chatUnread) : ''}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<TouchableOpacity
						onPress={onClose}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
					>
						<Icon name="close" size={26} color={colors.text} />
					</TouchableOpacity>
				</View>
				{tab === 'chat' ? (
					<ChatView
						messages={messages}
						draft={draft}
						setDraft={setDraft}
						onSend={onSend}
						sending={sending}
						hotlineNumber={game.hotlineNumber}
						teamReadAt={teamReadAt}
						hostReadAt={hostReadAt}
					/>
				) : (
					<ScrollView
						contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
					>
						{tab === 'activity' && (
							<ActivityList
								entries={activity}
								viewerTeamId={currentTeamId}
								highlightSince={highlightSince}
							/>
						)}
						{tab === 'leaderboard' &&
							sorted.map((t, i) => {
								const isCurrent = t.id === currentTeamId;
								const completed = t.completedQuestIds?.length ?? 0;
								const duration = raceTimeMs(t, game);
								return (
									<View
										key={t.id}
										style={[styles.lbRow, isCurrent && styles.lbRowCurrent]}
									>
										<View style={styles.lbRank}>
											{i < 3 ? (
												<View style={styles.lbPodium}>
													<Text style={styles.lbPodiumText}>{i + 1}</Text>
												</View>
											) : (
												<Text style={styles.lbRankText}>{i + 1}</Text>
											)}
										</View>
										<View style={{ flex: 1 }}>
											<Text
												style={[
													styles.lbTeamName,
													isCurrent && styles.lbTeamNameCurrent,
												]}
											>
												{t.name}
												{isCurrent ? copy.board.you : ''}
											</Text>
											<Text
												style={[
													styles.lbDetail,
													isCurrent && styles.lbDetailCurrent,
												]}
											>
												{duration !== null
													? copy.board.finished(formatDuration(duration))
													: copy.board.progress(completed, totalQuests)}
											</Text>
										</View>
									</View>
								);
							})}
					</ScrollView>
				)}
			</KeyboardAvoidingView>
		</Modal>
	);
}

function SpreadOverlay() {
	const styles = useStyles();
	return (
		<View style={styles.spreadOverlay}>
			<Text style={styles.spreadTitle}>{copy.spread.title}</Text>
			<Text style={styles.spreadMessage}>{copy.spread.message}</Text>
		</View>
	);
}

// A cursed team is frozen: no hint, no answers, no shop, and walking doesn't
// count, until the curse wears off
function CursedView({ by, msLeft }: { by: string; msLeft: number }) {
	const styles = useStyles();
	const { colors } = useTheme();
	const total = Math.ceil(msLeft / 1000);
	return (
		<View style={styles.container}>
			<View style={styles.finishedIcon}>
				<Icon name="skull-outline" size={96} color={colors.text} />
			</View>
			<Text style={styles.finishedHeading}>{copy.cursed.heading}</Text>
			<Text style={styles.finishedSub}>{copy.cursed.by(by)}</Text>
			<Countdown ms={total * 1000} />
			<Text style={[styles.message, { marginTop: 24 }]}>
				{copy.cursed.message}
			</Text>
		</View>
	);
}

function LocationDeniedView() {
	const styles = useStyles();
	return (
		<View style={styles.container}>
			<Text style={styles.heading}>{copy.locationDenied.heading}</Text>
			<Text style={styles.message}>{copy.locationDenied.message}</Text>
		</View>
	);
}

// ─── Celebration overlay ──────────────────────────────────────────────────────

function CelebrationOverlay({
	visible,
	anim,
}: {
	visible: boolean;
	anim: Animated.Value;
}) {
	const styles = useStyles();
	const { colors } = useTheme();
	if (!visible) return null;
	const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
	return (
		<Animated.View style={[styles.celebrationOverlay, { opacity: anim }]}>
			<Animated.View
				style={[styles.celebrationIcon, { transform: [{ scale }] }]}
			>
				<Icon name="party-popper" size={88} color={colors.text} />
			</Animated.View>
			<Text style={styles.celebrationText}>{copy.celebration}</Text>
		</Animated.View>
	);
}

// ─── Profile button + sheet ───────────────────────────────────────────────────

function ProfileButton({
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

function ProfileSheet({
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function GameScreen({ teamId }: { teamId: string }) {
	const [team, setTeam] = useState<Team | null>(null);
	const [game, setGame] = useState<Game | null>(null);
	const [quest, setQuest] = useState<Quest | null>(null);
	const [coords, setCoords] = useState<{
		lat: number;
		lng: number;
		accuracy: number | null;
	} | null>(null);
	const [localMeters, setLocalMeters] = useState(0);
	const [locationDenied, setLocationDenied] = useState(false);
	const [memberLocations, setMemberLocations] = useState<
		Record<string, { lat: number; lng: number } | null>
	>({});
	const [answer, setAnswer] = useState('');
	const [wrong, setWrong] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [now, setNow] = useState(Date.now());

	const lastWrittenRef = useRef<{ lat: number; lng: number; t: number } | null>(
		null,
	);
	const lastTrailRef = useRef<{ lat: number; lng: number; t: number } | null>(
		null,
	);

	const [celebrating, setCelebrating] = useState(false);
	const celebrateAnim = useRef(new Animated.Value(0)).current;

	const [allTeams, setAllTeams] = useState<Team[]>([]);
	const [leaderboardOpen, setLeaderboardOpen] = useState(false);
	const [sheetTab, setSheetTab] = useState<SheetTab>('activity');
	const [highlightSince, setHighlightSince] = useState(0);
	const [publicActivity, setPublicActivity] = useState<ActivityEntry[]>([]);
	const [teamActivity, setTeamActivity] = useState<ActivityEntry[]>([]);
	const [activitySeenAt, setActivitySeenAt] = useState(0);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [chatSeenAt, setChatSeenAt] = useState(0);
	const [draft, setDraft] = useState('');
	const [sendingMessage, setSendingMessage] = useState(false);
	const [shopOpen, setShopOpen] = useState(false);
	const [leavingGame, setLeavingGame] = useState(false);
	const [deletingAccount, setDeletingAccount] = useState(false);
	// Permission prompts wait behind an explainer, so they arrive with a reason
	const [introState, setIntroState] = useState<'unknown' | 'show' | 'done'>(
		'unknown',
	);
	const [buyingItem, setBuyingItem] = useState<ShopItemType | null>(null);
	const [heading, setHeading] = useState<number | null>(null);
	const [headingUncalibrated, setHeadingUncalibrated] = useState(false);

	const { profile } = useUser();
	const insets = useSafeAreaInsets();
	const [profileOpen, setProfileOpen] = useState(false);

	// This component loads the game, so it reads the theme directly; everything
	// it renders gets it through the provider below
	const theme = themeFor(game?.themeId);
	const styles = stylesFor(theme);

	// The hosts' console sends push using the token on this player's private
	// entry in the game — once per game, and again if it changes
	useEffect(() => {
		const uid = auth.currentUser?.uid;
		if (!uid || !game?.id || !profile?.pushToken) return;
		savePushToken(game.id, uid, profile.pushToken).catch(() => {});
	}, [game?.id, profile?.pushToken]);

	// Earlier builds left the position and token on the player list, which
	// every player in the game can read
	useEffect(() => {
		const uid = auth.currentUser?.uid;
		if (!uid || !game?.id) return;
		scrubPlayerListEntry(game.id, uid).catch(() => {});
	}, [game?.id]);

	// Tick for countdown
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	// Team
	useEffect(() => {
		return onSnapshot(doc(db, 'teams', teamId), (snap) => {
			setTeam(snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null);
		});
	}, [teamId]);

	// Game
	useEffect(() => {
		if (!team?.gameId) return;
		return onSnapshot(doc(db, 'games', team.gameId), (snap) => {
			setGame(snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null);
		});
	}, [team?.gameId]);

	// All teams for leaderboard + placement
	useEffect(() => {
		if (!game?.id) return;
		return onSnapshot(
			query(collection(db, 'teams'), where('gameId', '==', game.id)),
			(snap) =>
				setAllTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team)),
		);
	}, [game?.id]);

	// The board. Rules only allow a player to read public entries and their own
	// team's, so it takes two subscriptions rather than one unfiltered query.
	useEffect(() => {
		if (!game?.id) return;
		return onSnapshot(
			query(
				collection(db, 'games', game.id, 'activity'),
				where('visibility', '==', 'public'),
				orderBy('at', 'desc'),
				limit(100),
			),
			(snap) =>
				setPublicActivity(
					snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityEntry),
				),
			() => {},
		);
	}, [game?.id]);

	// Team-only listeners retry: see listen()
	useEffect(() => {
		if (!game?.id || !team?.id) return;
		return listen(
			query(
				collection(db, 'games', game.id, 'activity'),
				where('teamId', '==', team.id),
				orderBy('at', 'desc'),
				limit(100),
			),
			(snap) =>
				setTeamActivity(
					snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityEntry),
				),
		);
	}, [game?.id, team?.id]);

	const activity = useMemo(() => {
		const byId = new Map<string, ActivityEntry>();
		[...publicActivity, ...teamActivity].forEach((e) => byId.set(e.id, e));
		return [...byId.values()].sort((a, b) => b.at - a.at).slice(0, 100);
	}, [publicActivity, teamActivity]);

	// This team's thread with the hosts
	useEffect(() => {
		if (!game?.id || !team?.id) return;
		return listen(
			query(
				collection(db, 'games', game.id, 'messages'),
				where('teamId', '==', team.id),
				orderBy('sentAt', 'asc'),
			),
			(snap) =>
				setMessages(
					snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage),
				),
		);
	}, [game?.id, team?.id]);

	useEffect(() => {
		if (!game?.id) return;
		AsyncStorage.getItem(`chatSeen:${game.id}`)
			.then((v) => setChatSeenAt(v ? Number(v) : 0))
			.catch(() => {});
	}, [game?.id]);

	// Only the hosts' messages are news; your teammates' are not
	const chatUnread = messages.filter(
		(m) => m.fromHost && m.sentAt > chatSeenAt,
	).length;

	useEffect(() => {
		if (
			!leaderboardOpen ||
			sheetTab !== 'chat' ||
			!game?.id ||
			!messages.length
		)
			return;
		const newest = messages[messages.length - 1].sentAt;
		if (newest > chatSeenAt) {
			setChatSeenAt(newest);
			AsyncStorage.setItem(`chatSeen:${game.id}`, String(newest)).catch(
				() => {},
			);
		}
		// Shared marker, so the hosts can see their message was read
		if (team && (team.teamChatReadAt ?? 0) < newest) {
			updateDoc(doc(db, 'teams', team.id), { teamChatReadAt: newest }).catch(
				() => {},
			);
		}
	}, [
		leaderboardOpen,
		sheetTab,
		messages,
		chatSeenAt,
		game?.id,
		team?.id,
		team?.teamChatReadAt,
	]);

	function sendMessage() {
		const text = draft.trim();
		if (!text || !game || !team || sendingMessage) return;
		setSendingMessage(true);
		setDraft('');
		addDoc(collection(db, 'games', game.id, 'messages'), {
			teamId: team.id,
			authorId: auth.currentUser?.uid ?? '',
			authorName: profile?.name ?? copy.common.namelessPlayer,
			fromHost: false,
			text,
			sentAt: Date.now(),
		})
			.catch(() => setDraft(text))
			.finally(() => setSendingMessage(false));
	}

	// Remember what has been read, so the badge survives a restart
	useEffect(() => {
		if (!game?.id) return;
		AsyncStorage.getItem(`activitySeen:${game.id}`)
			.then((v) => setActivitySeenAt(v ? Number(v) : 0))
			.catch(() => {});
	}, [game?.id]);

	// Only other teams' actions and game-wide events count as news
	const newestFromOthers = useMemo(() => {
		const news = activity.filter((e) => isNewsFor(e, team?.id));
		return news.length ? news[0].at : 0;
	}, [activity, team?.id]);

	const hasUnreadActivity = newestFromOthers > activitySeenAt || chatUnread > 0;

	function openSheet(tab: SheetTab) {
		// Freeze what counts as new for this viewing, so rows stay marked while being read
		setHighlightSince(activitySeenAt);
		setSheetTab(tab);
		setLeaderboardOpen(true);
	}

	// Mark the board as read while it is actually open, including entries that
	// arrive while the player is looking at it
	useEffect(() => {
		if (!leaderboardOpen || sheetTab !== 'activity' || !game?.id) return;
		if (newestFromOthers <= activitySeenAt) return;
		setActivitySeenAt(newestFromOthers);
		AsyncStorage.setItem(
			`activitySeen:${game.id}`,
			String(newestFromOthers),
		).catch(() => {});
	}, [leaderboardOpen, sheetTab, newestFromOthers, activitySeenAt, game?.id]);

	// Current quest
	const currentQuestId = team?.currentQuestId ?? game?.questOrder?.[0] ?? null;
	useEffect(() => {
		if (!game?.id || !currentQuestId) {
			setQuest(null);
			return;
		}
		return onSnapshot(
			doc(db, 'games', game.id, 'quests', currentQuestId),
			(snap) => {
				setQuest(snap.exists() ? normalizeQuest(snap.id, snap.data()) : null);
			},
		);
	}, [game?.id, currentQuestId]);

	// v2: the location wording changed, so everyone reads it once more
	useEffect(() => {
		AsyncStorage.getItem('permissionsIntro:v2')
			.then((seen) => setIntroState(seen ? 'done' : 'show'))
			.catch(() => setIntroState('show'));
	}, []);

	async function finishIntro(grantNow: boolean) {
		setIntroState('done');
		AsyncStorage.setItem('permissionsIntro:v2', String(Date.now())).catch(
			() => {},
		);
		if (!grantNow) return;
		// Notifications are asked for here rather than at app launch, so the
		// prompt follows the explanation of what they are for
		try {
			const token = await requestPushToken();
			const uid = auth.currentUser?.uid;
			if (token && uid) {
				await updateDoc(doc(db, 'users', uid), { pushToken: token });
			}
		} catch {
			// Push is optional; the game works without it
		}
	}

	// Location is read only while the race is on for this player: from the
	// start until the game ends or their team finishes. Joining early asks for
	// the permissions, so nobody meets the prompts at the start line, but
	// tracks nothing until the start.
	const raceOver = !!game?.endedAt || !!team?.finishedAt;
	const raceStarted = !!game && now >= game.startDateTime;
	const [permissionsAsked, setPermissionsAsked] = useState(false);
	useEffect(() => {
		if (introState !== 'done') return;
		(async () => {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				setLocationDenied(true);
				return;
			}
			// "Always", for the background task. Background location isn't
			// available in every host app (Expo Go throws ERR_LOCATION_INFO_PLIST),
			// so failing here must not stop foreground tracking.
			await Location.requestBackgroundPermissionsAsync().catch(() => {});
			setPermissionsAsked(true);
		})();
	}, [introState]);
	const tracking = permissionsAsked && raceStarted && !raceOver && !!team && !!game;

	// Location — watch position, write lastLocation + trail to Firestore (throttled)
	useEffect(() => {
		if (!tracking || !team || !game) return;
		let sub: Location.LocationSubscription | null = null;
		let cancelled = false;
		(async () => {
			// Persist IDs for background task, and whether teammates need this
			// player's position (see the spread check below)
			const uid = auth.currentUser?.uid ?? '';
			await AsyncStorage.multiSet([
				['uid', uid],
				['teamId', team.id],
				['gameId', game.id],
				['spreadCheck', game.maxTeamSpreadMeters ? '1' : ''],
			]);

			try {
				const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
				if (bgStatus === 'granted' && !cancelled) {
					const running =
						await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
					if (!running) {
						await Location.startLocationUpdatesAsync(LOCATION_TASK, {
							accuracy: Location.Accuracy.Balanced,
							distanceInterval: 50,
							timeInterval: 60000,
							showsBackgroundLocationIndicator: true,
							// Android throttles background location to a few updates an
							// hour unless it runs as a foreground service, which also
							// tells the player, in a notification, that it is running
							foregroundService: {
								notificationTitle: copy.backgroundLocation.title,
								notificationBody: copy.backgroundLocation.body,
								notificationColor: '#111111',
							},
						});
					}
				}
			} catch {
				// Foreground tracking still works; the team trail just won't update in the background
			}

			const watch = await Location.watchPositionAsync(
				{ accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
				(loc) => {
					const { latitude: lat, longitude: lng, accuracy } = loc.coords;
					setCoords({ lat, lng, accuracy });

					const currentUid = auth.currentUser?.uid;
					if (!currentUid || !team || !game) return;

					const t = Date.now();
					const last = lastWrittenRef.current;
					const dist = last
						? distanceMeters(last.lat, last.lng, lat, lng)
						: Infinity;
					const elapsed = last ? t - last.t : Infinity;

					// Write lastLocation every 10 m or 30 s
					if (dist > 10 || elapsed > 30000) {
						lastWrittenRef.current = { lat, lng, t };
						// Teammates read it from the profile for the spread check, so
						// it goes there only when the race limits the spread
						if (game.maxTeamSpreadMeters) {
							updateDoc(doc(db, 'users', currentUid), {
								lastLocation: { lat, lng, updatedAt: t },
							}).catch(() => {});
						}
						// Hosts read positions from the player's private entry in the
						// game, never from profiles, which also hold the email address
						savePosition(game.id, currentUid, { lat, lng, updatedAt: t }).catch(
							() => {},
						);

						// Write trail point every 50 m or 2 min
						const lastTrail = lastTrailRef.current;
						const trailDist = lastTrail
							? distanceMeters(lastTrail.lat, lastTrail.lng, lat, lng)
							: Infinity;
						const trailElapsed = lastTrail ? t - lastTrail.t : Infinity;
						if (trailDist > 50 || trailElapsed > 120000) {
							lastTrailRef.current = { lat, lng, t };
							addDoc(collection(db, 'trail'), {
								userId: currentUid,
								teamId: team.id,
								gameId: game.id,
								lat,
								lng,
								t,
							}).catch(() => {});
						}
					}
				},
			);
			if (cancelled) watch.remove();
			else sub = watch;
		})();
		return () => {
			cancelled = true;
			sub?.remove();
		};
	}, [tracking, team?.id, game?.id]);

	// The background task runs only while tracking: it stops before the start
	// (a player who joined early) and once the race is over. Leaving the game,
	// signing out and deleting the account all unmount this screen.
	useEffect(() => {
		if (permissionsAsked && !tracking) stopBackgroundTracking();
	}, [permissionsAsked, tracking]);
	useEffect(() => () => void stopBackgroundTracking(), []);

	// Team member locations — for spread check
	useEffect(() => {
		if (!team?.memberIds?.length || team.memberIds.length < 2) {
			setMemberLocations({});
			return;
		}
		return listen(
			query(collection(db, 'users'), where(documentId(), 'in', team.memberIds)),
			(snap) => {
				const locs: Record<string, { lat: number; lng: number } | null> = {};
				snap.docs.forEach((d) => {
					const loc = d.data().lastLocation;
					locs[d.id] = loc ?? null;
				});
				setMemberLocations(locs);
			},
		);
	}, [JSON.stringify(team?.memberIds)]);

	const spreadTooLarge = useMemo(() => {
		if (!game?.maxTeamSpreadMeters) return false;
		const positions = Object.values(memberLocations).filter(
			(p): p is { lat: number; lng: number } => p !== null,
		);
		if (positions.length < 2) return false;
		for (let i = 0; i < positions.length; i++) {
			for (let j = i + 1; j < positions.length; j++) {
				if (
					distanceMeters(
						positions[i].lat,
						positions[i].lng,
						positions[j].lat,
						positions[j].lng,
					) > game.maxTeamSpreadMeters
				) {
					return true;
				}
			}
		}
		return false;
	}, [memberLocations, game?.maxTeamSpreadMeters]);

	// ── Quest trigger / progress ──────────────────────────────────────────────

	const progress =
		quest && team?.questProgress?.questId === quest.id
			? team.questProgress
			: null;
	const gameRunning =
		!!game &&
		!!team &&
		!game.endedAt &&
		!game.pausedAt &&
		!team.finishedAt &&
		now >= game.startDateTime;
	const cursedLeft = curseMsLeft(team, now);
	const cursed = cursedLeft > 0;

	const distanceToQuest =
		coords != null && quest?.location
			? distanceMeters(
					coords.lat,
					coords.lng,
					quest.location.lat,
					quest.location.lng,
				)
			: null;
	const insideFence =
		distanceToQuest !== null && distanceToQuest <= (quest?.fenceRadius ?? 50);
	const teamMeters = progress?.distanceMeters ?? 0;
	const walkedMeters = Math.max(localMeters, teamMeters);

	let unlocked = false;
	if (quest?.trigger === 'none') unlocked = true;
	// Answer quests need the team at the location; timers and info stay open once reached
	if (quest?.trigger === 'location')
		unlocked =
			insideFence || (quest.task !== 'answer' && !!progress?.unlockedAt);
	if (quest?.trigger === 'distance')
		unlocked =
			!!progress?.unlockedAt || walkedMeters >= (quest.distanceMeters ?? 0);

	// Distance walked while cursed doesn't count
	const trackingDistance =
		gameRunning &&
		!cursed &&
		quest?.trigger === 'distance' &&
		!progress?.unlockedAt;

	// Plain writes from the local snapshot (not transactions) so progress still queues while offline.
	// Concurrent writes from teammates only differ by seconds/meters, so last-write-wins is fine.
	function updateQuestProgress(
		questId: string,
		patch: { distanceMeters?: number; unlock?: boolean },
	) {
		if (!team || !game) return Promise.resolve();
		const existing =
			team.questProgress?.questId === questId ? team.questProgress : null;
		const next: QuestProgress = {
			questId,
			unlockedAt: existing?.unlockedAt ?? null,
			pausedMsAtUnlock: existing?.pausedMsAtUnlock ?? 0,
			distanceMeters: Math.max(
				existing?.distanceMeters ?? 0,
				Math.round(patch.distanceMeters ?? 0),
			),
		};
		if (patch.unlock && !next.unlockedAt) {
			next.unlockedAt = Date.now();
			next.pausedMsAtUnlock = game.totalPausedMs ?? 0;
		}
		return updateDoc(doc(db, 'teams', team.id), { questProgress: next });
	}

	// Record when timer/info quests unlock so the countdown is shared and survives leaving the fence
	const unlockPendingRef = useRef<string | null>(null);
	useEffect(() => {
		if (!quest || !gameRunning || cursed || !unlocked || progress?.unlockedAt)
			return;
		if (quest.task === 'answer' || quest.trigger === 'distance') return;
		if (unlockPendingRef.current === quest.id) return;
		unlockPendingRef.current = quest.id;
		updateQuestProgress(quest.id, { unlock: true }).catch(() => {
			unlockPendingRef.current = null;
		});
	}, [quest?.id, gameRunning, cursed, unlocked, progress?.unlockedAt]);

	// Start/stop the persistent distance tracker (also fed by the background location task)
	useEffect(() => {
		if (!quest) return;
		if (trackingDistance) {
			startTracking(quest.id, teamMeters)
				.then((s) => setLocalMeters(s.meters))
				.catch(() => {});
		} else {
			stopTracking().catch(() => {});
			setLocalMeters(0);
		}
	}, [quest?.id, trackingDistance]);

	useEffect(() => {
		if (!coords || !trackingDistance || !quest) return;
		const questId = quest.id;
		recordPosition(coords.lat, coords.lng, coords.accuracy)
			.then((s) => {
				if (s?.questId === questId) setLocalMeters(s.meters);
			})
			.catch(() => {});
	}, [coords, trackingDistance, quest?.id]);

	// Share distance progress with the team, and unlock once the target is reached.
	// The local snapshot reflects the write immediately, which stops this from re-firing.
	useEffect(() => {
		if (!trackingDistance || !quest) return;
		const reached = localMeters >= (quest.distanceMeters ?? 0);
		if (!reached && localMeters - teamMeters < DISTANCE_SYNC_STEP_METERS)
			return;
		updateQuestProgress(quest.id, {
			distanceMeters: localMeters,
			unlock: reached,
		}).catch(() => {});
	}, [localMeters, teamMeters, trackingDistance, quest?.id]);

	const economy = gameEconomy(game);
	const shop = shopConfig(game);
	const coins = teamCoins(team, economy);
	const compassLeft = compassMsLeftFor(team, now);
	const radarLeft = radarMsLeftFor(team, now);

	// The magnetometer only runs while a compass is active, to spare the battery
	useEffect(() => {
		if (compassLeft <= 0) {
			setHeading(null);
			setHeadingUncalibrated(false);
			return;
		}
		let sub: Location.LocationSubscription | null = null;
		let cancelled = false;
		// Android hands over the magnetometer's raw readings, which jitter on
		// cheaper phones; iOS smooths its heading itself. The average is taken of
		// directions, not numbers, so it stays right across north (359° → 1°).
		const smoothed = { x: 0, y: 0, started: false };
		Location.watchHeadingAsync((h) => {
			// Both platforms report 0–3 (Expo maps iOS's degrees onto Android's
			// scale); 1 is low, 0 unreliable
			setHeadingUncalibrated(h.accuracy <= 1);
			const raw = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
			if (Platform.OS !== 'android') {
				setHeading(raw);
				return;
			}
			const r = (raw * Math.PI) / 180;
			if (!smoothed.started) {
				smoothed.x = Math.cos(r);
				smoothed.y = Math.sin(r);
				smoothed.started = true;
			} else {
				smoothed.x += (Math.cos(r) - smoothed.x) * HEADING_SMOOTHING;
				smoothed.y += (Math.sin(r) - smoothed.y) * HEADING_SMOOTHING;
			}
			setHeading(
				((Math.atan2(smoothed.y, smoothed.x) * 180) / Math.PI + 360) % 360,
			);
		})
			.then((s) => {
				if (cancelled) s.remove();
				else sub = s;
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			sub?.remove();
		};
	}, [compassLeft > 0]);

	// Leaving takes this player out of the team but leaves the team's progress
	// alone — it belongs to the team, not to any one member
	async function leaveGame() {
		const uid = auth.currentUser?.uid;
		if (!uid || !team || leavingGame) return;
		setLeavingGame(true);
		try {
			await updateDoc(doc(db, 'teams', team.id), {
				memberIds: (team.memberIds ?? []).filter((id) => id !== uid),
			});
			await updateDoc(doc(db, 'users', uid), { teamId: null, gameId: null });
			if (game) {
				await deleteDoc(doc(db, 'games', game.id, 'players', uid)).catch(
					() => {},
				);
				await removePrivateEntry(game.id, uid).catch(() => {});
			}
		} catch {
			setLeavingGame(false);
		}
	}

	// Why each item can't be bought right now, if it can't. Nothing is for
	// sale once a team has finished, or while it is cursed. The compass and
	// radar only have a job while the team is still looking for a place.
	const otherTeams = allTeams.filter((t) => t.id !== team?.id);
	const shopClosed = !team
		? copy.shop.notOnTeam
		: team.finishedAt
			? copy.shop.raceOver
			: cursed
				? copy.shop.youreCursed
				: !gameRunning
					? copy.shop.notRunning
					: null;
	const findingBlocked =
		quest?.trigger !== 'location' || !quest?.location
			? copy.shop.nothingToPoint
			: unlocked
				? copy.shop.alreadyThere
				: null;
	const itemBlocked: Partial<Record<ShopItemType, string | null>> = {
		compass: shopClosed ?? findingBlocked,
		radar: shopClosed ?? findingBlocked,
		shield: shopClosed,
		curse: shopClosed ?? (otherTeams.length ? null : copy.shop.noOtherTeams),
		robbery: shopClosed ?? (otherTeams.length ? null : copy.shop.noOtherTeams),
		donate: shopClosed ?? (otherTeams.length ? null : copy.shop.noOtherTeams),
	};
	const itemRunning: Partial<Record<ShopItemType, number>> = {
		compass: compassLeft,
		radar: radarLeft,
	};

	// Items for your own team are written here, like hints: offline-friendly,
	// and private to the team, so rivals don't see what you buy
	function buyForTeam(type: ShopItemType) {
		if (!team || !game || buyingItem || itemBlocked[type]) return;
		const price = shop[type].price;
		if (coins < price || (itemRunning[type] ?? 0) > 0) return;
		setBuyingItem(type);
		const at = Date.now();
		const until = at + shop[type].durationMinutes * 60000;
		const change: Record<string, unknown> = { coins: coins - price };
		if (type === 'compass') change.activeCompassUntil = until;
		if (type === 'radar') change.activeRadarUntil = until;
		if (type === 'shield') change.shields = (team.shields ?? 0) + 1;
		const batch = writeBatch(db);
		batch.update(doc(db, 'teams', team.id), change);
		batch.set(doc(db, 'games', game.id, 'activity', `${team.id}_${type}_${at}`), {
			type: 'item_bought',
			at,
			visibility: 'team',
			teamId: team.id,
			teamName: team.name,
			itemType: type,
			itemName: copy.items[type].bought,
			amount: price,
		});
		batch
			.commit()
			.catch(() => {})
			.finally(() => setBuyingItem(null));
		// Back to the hint, where the arrow or the radar now helps
		if (type === 'compass' || type === 'radar') setShopOpen(false);
	}

	// Items used on another team go through the server, which may change a
	// team other than your own
	async function useOnTeam(
		type: ShopItemType,
		targetTeamId: string,
		amount?: number,
	): Promise<string> {
		if (!game) throw new Error(copy.network.somethingWrong);
		setBuyingItem(type);
		try {
			const res = await callApi<{
				outcome: 'cursed' | 'robbed' | 'blocked' | 'donated';
				targetTeamName: string;
				amount: number | null;
			}>('/api/use-item', { gameId: game.id, item: type, targetTeamId, amount });
			const n = res.amount ?? 0;
			const team = res.targetTeamName;
			return {
				cursed: copy.shop.cursed(team, shop.curse.durationMinutes),
				robbed: copy.shop.robbed(n, team),
				blocked: copy.shop.blocked(team),
				donated: copy.shop.donated(n, team),
			}[res.outcome];
		} finally {
			setBuyingItem(null);
		}
	}
	const hintsRevealed = quest ? hintsRevealedFor(team, quest.id) : 0;

	// Absolute balances rather than increments: two teammates writing at once land on the
	// same number instead of paying twice, and it still works offline.
	function revealHint() {
		if (!team || !game || !quest) return;
		const hints = quest.hints ?? [];
		if (hintsRevealed >= hints.length || coins < economy.hintCost) return;
		const batch = writeBatch(db);
		batch.update(doc(db, 'teams', team.id), {
			coins: coins - economy.hintCost,
			hintsRevealed: {
				...(team.hintsRevealed ?? {}),
				[quest.id]: hintsRevealed + 1,
			},
		});
		// Only this team sees what it spends money on
		batch.set(
			doc(
				db,
				'games',
				game.id,
				'activity',
				hintRevealedId(team.id, quest.id, hintsRevealed + 1),
			),
			{
				type: 'hint_revealed',
				at: Date.now(),
				visibility: 'team',
				teamId: team.id,
				teamName: team.name,
				questTitle: quest.title,
				amount: economy.hintCost,
			},
		);
		batch.commit().catch(() => {});
	}

	function completeQuest(completed: Quest) {
		if (!team || !game) return Promise.resolve();
		const nextQuestId =
			game.questOrder[game.questOrder.indexOf(completed.id) + 1] ?? null;
		// One clock for both entries: equal timestamps sort arbitrarily, and
		// finishing has to read after the solve that caused it
		const at = Date.now();
		const update: Record<string, unknown> = {
			completedQuestIds: arrayUnion(completed.id),
			currentQuestId: nextQuestId,
			questProgress: null,
			coins: coins + economy.coinsPerQuest,
		};
		if (!nextQuestId) {
			update.finishedAt = at;
			// Pauses after this don't count against the team's time
			update.pausedMsAtFinish = game.totalPausedMs ?? 0;
		}

		// Progress and its board entry land together, or not at all. The entry ids are
		// derived from the quest, so two teammates solving at once write one entry.
		const batch = writeBatch(db);
		batch.update(doc(db, 'teams', team.id), update);
		batch.set(
			doc(
				db,
				'games',
				game.id,
				'activity',
				questSolvedId(team.id, completed.id),
			),
			{
				type: 'quest_solved',
				at,
				visibility: 'public',
				teamId: team.id,
				teamName: team.name,
				// No title: every team reads this entry, and a descriptive title
				// would give away a quest they haven't hunted for yet
				questNumber: game.questOrder.indexOf(completed.id) + 1,
			},
		);
		if (!nextQuestId) {
			batch.set(
				doc(db, 'games', game.id, 'activity', teamFinishedId(team.id)),
				{
					type: 'team_finished',
					at: at + 1,
					visibility: 'public',
					teamId: team.id,
					teamName: team.name,
					placement: allTeams.filter((t) => t.finishedAt).length + 1,
				},
			);
		}
		return batch.commit();
	}

	function continueQuest() {
		if (!quest || submitting) return;
		setSubmitting(true);
		completeQuest(quest).catch(() => {});
		// Brief lockout so a double tap can't also complete the next quest. Not tied to the
		// write acknowledgement, which never arrives while offline.
		setTimeout(() => setSubmitting(false), 1000);
	}

	async function submitAnswer() {
		if (
			!quest ||
			!team ||
			!game ||
			submitting ||
			cursed ||
			!answer.trim() ||
			spreadTooLarge
		)
			return;
		const normalized = answer.trim().toLowerCase();
		const correct = (quest.answers ?? []).some(
			(a) => a.trim().toLowerCase() === normalized,
		);
		if (!correct) {
			setWrong(true);
			setTimeout(() => setWrong(false), 2000);
			// Recorded for the hosts, who can widen the answer list mid-race
			addDoc(collection(db, 'games', game.id, 'attempts'), {
				questId: quest.id,
				teamId: team.id,
				teamName: team.name,
				text: answer.trim(),
				at: Date.now(),
			}).catch(() => {});
			return;
		}

		setSubmitting(true);
		setAnswer('');

		// Show celebration, then advance quest
		setCelebrating(true);
		Animated.spring(celebrateAnim, {
			toValue: 1,
			useNativeDriver: true,
		}).start();
		setTimeout(async () => {
			setCelebrating(false);
			celebrateAnim.setValue(0);
			try {
				await completeQuest(quest);
			} finally {
				setSubmitting(false);
			}
		}, 2000);
	}

	// ── Render ────────────────────────────────────────────────────────────────

	const userName = profile?.name ?? '';

	function renderContent() {
		if (locationDenied) return <LocationDeniedView />;
		if (!team || !game) {
			return (
				<View style={styles.container}>
					<ActivityIndicator size="large" color={theme.colors.text} />
				</View>
			);
		}

		if (game.endedAt) return <EndedView game={game} teamId={team.id} />;
		if (game.pausedAt) return <PausedView />;
		if (now < game.startDateTime) return <WaitingView game={game} now={now} />;
		if (cursed)
			return (
				<CursedView
					by={team.cursedByName ?? copy.cursed.anotherTeam}
					msLeft={cursedLeft}
				/>
			);
		if (team.finishedAt)
			return (
				<FinishedView
					game={game}
					team={team}
					allTeams={allTeams}
					onLeaderboard={() => openSheet('leaderboard')}
				/>
			);
		if (!quest) {
			return (
				<View style={styles.container}>
					<Text style={styles.message}>{copy.quest.none}</Text>
				</View>
			);
		}

		const questNumber = game.questOrder.indexOf(quest.id) + 1;
		const totalQuests = game.questOrder.length;

		if (!unlocked) {
			if (quest.trigger === 'distance')
				return <DistanceView quest={quest} meters={walkedMeters} />;
			return (
				<NavigationView
					quest={quest}
					distance={distanceToQuest}
					bearing={
						coords && quest.location
							? bearingDegrees(
									coords.lat,
									coords.lng,
									quest.location.lat,
									quest.location.lng,
								)
							: null
					}
					heading={heading}
					headingUncalibrated={headingUncalibrated}
					compassMsLeft={compassLeft}
					radarMsLeft={radarLeft}
				/>
			);
		}

		if (quest.task === 'timer') {
			// Until the unlock write lands, show the full duration
			const elapsed = progress?.unlockedAt
				? now -
					progress.unlockedAt -
					((game.totalPausedMs ?? 0) - progress.pausedMsAtUnlock)
				: 0;
			return (
				<TimerView
					quest={quest}
					questNumber={questNumber}
					totalQuests={totalQuests}
					remainingMs={(quest.durationSeconds ?? 0) * 1000 - elapsed}
					submitting={submitting || !progress?.unlockedAt}
					onContinue={continueQuest}
				/>
			);
		}

		if (quest.task === 'continue') {
			return (
				<InfoView
					quest={quest}
					questNumber={questNumber}
					totalQuests={totalQuests}
					submitting={submitting}
					onContinue={continueQuest}
				/>
			);
		}

		return (
			<View style={{ flex: 1 }}>
				<QuestView
					quest={quest}
					questNumber={questNumber}
					totalQuests={totalQuests}
					answer={answer}
					setAnswer={setAnswer}
					wrong={wrong}
					submitting={submitting}
					onSubmit={submitAnswer}
					hintsRevealed={hintsRevealed}
					hintCost={economy.hintCost}
					coins={coins}
					onRevealHint={revealHint}
				/>
				{spreadTooLarge && <SpreadOverlay />}
			</View>
		);
	}

	return (
		<ThemeProvider themeId={game?.themeId}>
			<StatusBar style={theme.dark ? 'light' : 'dark'} />
			<View style={{ flex: 1, backgroundColor: theme.colors.background }}>
				{renderContent()}
				<CelebrationOverlay visible={celebrating} anim={celebrateAnim} />
				{team && !game?.endedAt && (
					<TouchableOpacity
						style={[styles.coinPill, { top: insets.top + 8 }]}
						onPress={() => setShopOpen(true)}
					>
						<Icon
							name="circle-multiple-outline"
							size={16}
							color={theme.colors.onSurface}
						/>
						<Text style={styles.coinPillText}>{coins}</Text>
						{compassLeft > 0 && (
							<Icon
								name="compass-outline"
								size={16}
								color={theme.colors.onSurface}
							/>
						)}
						{radarLeft > 0 && (
							<Icon name="radar" size={16} color={theme.colors.onSurface} />
						)}
						{(team.shields ?? 0) > 0 && (
							<Icon name="shield-outline" size={16} color={theme.colors.onSurface} />
						)}
					</TouchableOpacity>
				)}
				<TouchableOpacity
					style={[
						styles.roundButton,
						styles.lbIconButton,
						{ top: insets.top + 8 },
					]}
					onPress={() => openSheet('activity')}
				>
					<Icon name="menu" size={20} color={theme.colors.onAccent} />
					{hasUnreadActivity && <View style={styles.unreadDot} />}
				</TouchableOpacity>
				<ProfileButton
					name={userName}
					top={insets.top + 8}
					onPress={() => setProfileOpen(true)}
				/>
				{/* Avatar (temporary) */}
				{team && game && (
					<AvatarButton
						gameId={game.id}
						teamId={team.id}
						questOrder={game.questOrder}
						currentQuestId={team.currentQuestId}
						finished={!!team.finishedAt}
						top={insets.top + 8 + 36 + 10}
					/>
				)}
				<ShopSheet
					visible={shopOpen}
					onClose={() => setShopOpen(false)}
					shop={shop}
					coins={coins}
					shields={team?.shields ?? 0}
					running={itemRunning}
					blocked={itemBlocked}
					targets={otherTeams}
					onBuyForTeam={buyForTeam}
					onUseOnTeam={useOnTeam}
					buying={buyingItem}
				/>
				<ProfileSheet
					visible={profileOpen}
					name={userName}
					onLeaveGame={leaveGame}
					leaving={leavingGame}
					onDeleteAccount={() => {
						setProfileOpen(false);
						setDeletingAccount(true);
					}}
					onReport={() => {
						setProfileOpen(false);
						reportProblem({
							gameId: game?.id,
							gameName: game?.name,
							teamName: team?.name,
						});
					}}
					onClose={() => setProfileOpen(false)}
				/>
				<DeleteAccountModal
					visible={deletingAccount}
					onClose={() => setDeletingAccount(false)}
				/>
				<PermissionsIntro
					visible={introState === 'show'}
					onContinue={() => finishIntro(true)}
				/>
				{game && (
					<LeaderboardModal
						visible={leaderboardOpen}
						onClose={() => setLeaderboardOpen(false)}
						game={game}
						allTeams={allTeams}
						currentTeamId={teamId}
						activity={activity}
						tab={sheetTab}
						onTabChange={setSheetTab}
						highlightSince={highlightSince}
						messages={messages}
						chatUnread={chatUnread}
						draft={draft}
						setDraft={setDraft}
						onSend={sendMessage}
						sending={sendingMessage}
						teamReadAt={team?.teamChatReadAt ?? 0}
						hostReadAt={team?.hostChatReadAt ?? 0}
					/>
				)}
			</View>
		</ThemeProvider>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(t: Theme) {
	const c = t.colors;
	return StyleSheet.create({
		container: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: 32,
			backgroundColor: c.background,
		},
		scroll: {
			flex: 1,
			backgroundColor: c.background,
		},
		scrollContent: {
			flexGrow: 1,
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: 32,
			paddingTop: 100, // clear the floating header buttons
			paddingBottom: 48,
		},

		// Waiting
		label: {
			...ui.label(t),
			marginBottom: 16,
			textAlign: 'center',
		},
		gameName: {
			...ui.heading(t, 40),
			textAlign: 'center',
			marginBottom: 8,
		},
		countdownLabel: {
			fontSize: 20,
			color: c.muted,
			marginTop: 40,
			marginBottom: 8,
		},
		countdownRow: {
			flexDirection: 'row',
			justifyContent: 'center',
		},
		countdown: {
			...ui.heading(t, 72),
			letterSpacing: 0,
			textAlign: 'center',
		},

		// Navigation
		navigationHint: {
			fontSize: 24,
			fontWeight: '600',
			color: c.onSurface,
			textAlign: 'center',
			lineHeight: 34,
		},
		// The hint is the whole screen's job, so it gets a panel of its own
		hintPanel: {
			...ui.panel(t),
			width: '100%',
			paddingHorizontal: 20,
			paddingTop: 20,
			paddingBottom: 4, // each text block already carries space below it
			marginBottom: 20,
		},
		distance: {
			fontSize: 18,
			color: c.muted,
		},
		progressTrack: {
			width: '100%',
			height: 12,
			borderRadius: t.shape.radius,
			backgroundColor: c.surface,
			borderWidth: t.shape.shadowOffset ? t.shape.borderWidth : 0,
			borderColor: c.border,
			overflow: 'hidden',
			marginTop: 16,
			marginBottom: 12,
		},
		progressFill: {
			height: '100%',
			backgroundColor: c.accent,
		},

		// Quest
		questNumber: {
			...ui.label(t),
			marginBottom: 16,
		},
		questTitle: {
			...ui.heading(t, 34),
			textAlign: 'center',
			marginBottom: 16,
		},
		questDescription: {
			fontSize: 18,
			color: c.text,
			textAlign: 'center',
			lineHeight: 27,
			marginBottom: 16,
		},
		answerRow: {
			flexDirection: 'row',
			width: '100%',
			gap: 8,
			marginTop: 24,
		},
		answerInput: {
			...ui.input(t),
			flex: 1,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 18,
		},
		answerInputWrong: {
			borderColor: c.danger,
		},
		submitButton: {
			...ui.button(t),
			width: 52,
			height: 52,
		},
		submitButtonDisabled: {
			opacity: 0.4,
		},
		timerCountdown: {
			marginBottom: 32,
		},
		continueButton: {
			...ui.button(t),
			flexDirection: 'row',
			gap: 8,
			marginTop: 24,
			paddingHorizontal: 32,
			paddingVertical: 16,
		},
		continueButtonText: {
			...ui.buttonText(t),
			fontSize: 18,
		},
		// Errors sit on a surface chip, where the danger colour holds its contrast
		wrongText: {
			marginTop: 12,
			fontSize: 15,
			fontWeight: '600',
			color: c.danger,
			backgroundColor: c.surface,
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: t.shape.radius,
			overflow: 'hidden',
		},

		// Finished
		finishedIcon: {
			marginBottom: 24,
		},
		finishedHeading: {
			...ui.heading(t, 38),
			textAlign: 'center',
			paddingHorizontal: 16,
			marginBottom: 12,
		},
		finishedPlacement: {
			...ui.heading(t, 32),
			marginBottom: 6,
		},
		finishedSub: {
			fontSize: 20,
			color: c.muted,
			marginBottom: 36,
		},
		leaderboardButton: {
			...ui.outlineButton(t),
			flexDirection: 'row',
			gap: 8,
			paddingHorizontal: 24,
			paddingVertical: 14,
		},
		leaderboardButtonText: {
			...ui.buttonText(t),
			fontSize: 15,
			color: c.text,
		},
		recapButton: {
			...ui.button(t),
			flexDirection: 'row',
			gap: 8,
			paddingHorizontal: 24,
			paddingVertical: 14,
		},
		recapButtonText: {
			...ui.buttonText(t),
			fontSize: 15,
		},

		// Spread overlay
		spreadOverlay: {
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: c.accent + 'E6',
			justifyContent: 'center',
			alignItems: 'center',
			padding: 32,
		},
		spreadTitle: {
			fontFamily: t.fonts.display,
			fontSize: 22,
			fontWeight: t.fonts.display ? 'normal' : '700',
			textTransform: t.uppercaseHeadings ? 'uppercase' : 'none',
			color: c.onAccent,
			textAlign: 'center',
			marginBottom: 12,
		},
		spreadMessage: {
			fontSize: 15,
			color: c.onAccent,
			opacity: 0.8,
			textAlign: 'center',
			lineHeight: 22,
		},

		// Celebration overlay
		celebrationOverlay: {
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: c.background + 'EB',
			justifyContent: 'center',
			alignItems: 'center',
		},
		celebrationIcon: {
			marginBottom: 16,
		},
		celebrationText: ui.heading(t, 36),

		// Hints
		hintSection: {
			width: '100%',
			marginTop: 28,
		},
		hintCard: {
			...ui.panel(t),
			backgroundColor: c.highlight,
			borderColor: t.shape.shadowOffset ? c.border : c.highlight,
			width: '100%',
			padding: 14,
			marginBottom: 10,
		},
		hintLabel: {
			...ui.label(t),
			fontSize: 11,
			letterSpacing: 2,
			color: c.onHighlight,
			marginBottom: 4,
		},
		hintText: {
			fontSize: 17,
			color: c.onHighlight,
			lineHeight: 24,
		},
		hintButton: {
			...ui.outlineButton(t),
			alignSelf: 'center',
			paddingHorizontal: 20,
			paddingVertical: 12,
		},
		hintButtonText: {
			fontSize: 16,
			fontWeight: '600',
			color: c.text,
		},

		// Compass
		compassWrap: {
			alignItems: 'center',
			marginBottom: 16,
		},
		compassDial: {
			width: 92,
			height: 92,
			borderRadius: 46,
			borderWidth: Math.max(2, t.shape.borderWidth),
			borderColor: c.accent,
			backgroundColor: c.surface,
			alignItems: 'center',
			justifyContent: 'center',
		},
		compassDistance: {
			fontSize: 18,
			fontWeight: '600',
			color: c.text,
			marginTop: 12,
		},
		compassHint: {
			fontSize: 14,
			fontWeight: '600',
			color: c.danger,
			backgroundColor: c.surface,
			borderRadius: t.shape.radius,
			overflow: 'hidden',
			paddingHorizontal: 12,
			paddingVertical: 6,
			marginTop: 10,
			textAlign: 'center',
		},
		compassMeta: {
			fontSize: 14,
			color: c.muted,
			marginTop: 8,
			fontVariant: ['tabular-nums'],
		},

		// Coin balance pill
		// A plain pill: an even border all round, as tall as the round buttons
		coinPill: {
			position: 'absolute',
			top: 52, // replaced at render with the real safe-area inset
			left: 16,
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			paddingHorizontal: 14,
			height: 36,
			borderRadius: 18,
			backgroundColor: c.surface,
			borderWidth: t.shape.shadowOffset ? 2 : 0,
			borderColor: c.border,
		},
		coinPillText: {
			fontSize: 15,
			fontWeight: '700',
			color: c.onSurface,
			fontVariant: ['tabular-nums'],
		},

		// Round header buttons (activity, profile)
		roundButton: {
			position: 'absolute',
			top: 52, // replaced at render with the real safe-area inset
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: c.accent,
			justifyContent: 'center',
			alignItems: 'center',
		},
		lbIconButton: {
			right: 60,
		},
		profileButton: {
			right: 16,
		},
		profileButtonText: {
			fontFamily: t.fonts.display,
			color: c.onAccent,
			fontSize: 15,
			fontWeight: t.fonts.display ? 'normal' : '700',
		},

		// Chat
		chatWrap: {
			flex: 1,
		},
		chatMessages: {
			paddingHorizontal: 16,
			paddingTop: 8,
			paddingBottom: 16,
		},
		chatInput: {
			maxHeight: 110,
		},
		hotlineBar: {
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: c.border,
		},
		hotlineBarText: {
			fontSize: 13,
			color: c.muted,
		},
		hotlineBarLink: {
			color: c.text,
			fontWeight: '700',
		},
		seenLabel: {
			fontSize: 11,
			color: c.muted,
			marginTop: -6,
			marginBottom: 10,
		},
		seenLabelRight: {
			textAlign: 'right',
		},
		seenLabelLeft: {
			textAlign: 'left',
		},
		bubbleRow: {
			flexDirection: 'row',
			marginBottom: 10,
		},
		bubbleRowLeft: {
			justifyContent: 'flex-start',
		},
		bubbleRowRight: {
			justifyContent: 'flex-end',
		},
		bubble: {
			maxWidth: '80%',
			borderRadius: t.shape.radius + 2,
			paddingHorizontal: 12,
			paddingVertical: 9,
		},
		bubbleHost: {
			...ui.panel(t),
			borderRadius: t.shape.radius + 2,
		},
		bubbleMine: {
			backgroundColor: c.accent,
		},
		bubbleTextHost: {
			fontSize: 16,
			color: c.onSurface,
			lineHeight: 22,
		},
		bubbleTextMine: {
			fontSize: 16,
			color: c.onAccent,
			lineHeight: 22,
		},
		bubbleMetaHost: {
			fontSize: 11,
			color: c.mutedOnSurface,
			marginTop: 4,
		},
		bubbleMetaMine: {
			fontSize: 11,
			color: c.onAccent,
			opacity: 0.6,
			marginTop: 4,
		},
		chatInputRow: {
			flexDirection: 'row',
			alignItems: 'flex-end',
			gap: 8,
			paddingHorizontal: 16,
			paddingTop: 8,
			paddingBottom: 12,
			borderTopWidth: 1,
			borderTopColor: c.border,
			backgroundColor: c.background,
		},

		// Activity feed
		// Full-width rows, like the board's, so the columns line up edge to edge
		activityRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 14,
			paddingVertical: 14,
			marginHorizontal: -16,
			paddingHorizontal: 16,
			borderBottomWidth: 1,
			borderBottomColor: c.border,
		},
		activityBadge: {
			width: 34,
			height: 34,
			borderRadius: 17,
			backgroundColor: c.accent,
			alignItems: 'center',
			justifyContent: 'center',
		},
		activityMeta: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 5,
			marginTop: 3,
		},
		activityText: {
			fontSize: 16,
			color: c.text,
			lineHeight: 22,
		},
		activityTime: {
			fontSize: 13,
			color: c.muted,
			fontVariant: ['tabular-nums'],
		},
		activityRowNew: {
			backgroundColor: c.highlight,
		},
		activityTextNew: {
			color: c.onHighlight,
		},
		newDot: {
			width: 9,
			height: 9,
			borderRadius: 5,
			backgroundColor: c.danger,
		},
		tabRow: {
			flexDirection: 'row',
			gap: 16,
		},
		tabLabel: {
			...ui.heading(t, 22),
			color: c.muted,
			textShadowColor: 'transparent',
			opacity: 0.6,
		},
		tabLabelActive: {
			...ui.heading(t, 22),
		},
		unreadDot: {
			position: 'absolute',
			top: 0,
			right: 0,
			width: 10,
			height: 10,
			borderRadius: 5,
			backgroundColor: c.danger,
			borderWidth: 1.5,
			borderColor: c.background,
		},

		// Leaderboard modal
		modal: {
			flex: 1,
			backgroundColor: c.background,
		},
		lbHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 20,
			paddingTop: 60,
			paddingBottom: 16,
			borderBottomWidth: t.shape.shadowOffset ? t.shape.borderWidth : 1,
			borderBottomColor: c.border,
		},
		lbRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12,
			paddingVertical: 14,
			borderBottomWidth: 1,
			borderBottomColor: c.border,
		},
		lbRowCurrent: {
			backgroundColor: c.highlight,
			marginHorizontal: -16,
			paddingHorizontal: 16,
		},
		lbRank: {
			width: 36,
			alignItems: 'center',
		},
		lbRankText: {
			fontFamily: t.fonts.display,
			fontSize: 16,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.muted,
		},
		// The podium gets a filled badge instead of a medal emoji
		lbPodium: {
			width: 30,
			height: 30,
			borderRadius: 15,
			backgroundColor: c.accent,
			alignItems: 'center',
			justifyContent: 'center',
		},
		lbPodiumText: {
			fontFamily: t.fonts.display,
			fontSize: 15,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.onAccent,
		},
		lbTeamName: {
			fontSize: 17,
			fontWeight: '600',
			color: c.text,
			marginBottom: 2,
		},
		lbTeamNameCurrent: {
			color: c.onHighlight,
		},
		lbDetail: {
			fontSize: 14,
			color: c.muted,
		},
		lbDetailCurrent: {
			color: c.onHighlight,
			opacity: 0.8,
		},

		// Profile sheet
		sheetBackdrop: {
			flex: 1,
			backgroundColor: 'rgba(0,0,0,0.4)',
			justifyContent: 'flex-end',
		},
		sheet: {
			backgroundColor: c.surface,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			borderWidth: t.shape.shadowOffset ? t.shape.borderWidth : 0,
			borderBottomWidth: 0,
			borderColor: c.border,
			paddingHorizontal: 24,
			paddingBottom: 48,
			paddingTop: 12,
		},
		sheetHandle: {
			width: 40,
			height: 4,
			backgroundColor: c.mutedOnSurface,
			opacity: 0.35,
			borderRadius: 2,
			alignSelf: 'center',
			marginBottom: 24,
		},
		sheetName: {
			fontFamily: t.fonts.display,
			fontSize: 22,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.onSurface,
			marginBottom: 24,
		},
		sheetRow: {
			paddingVertical: 16,
			borderTopWidth: 1,
			borderTopColor: c.border,
		},
		sheetRowText: {
			fontSize: 16,
			color: c.onSurface,
		},
		sheetConfirmText: {
			fontSize: 14,
			color: c.mutedOnSurface,
			lineHeight: 20,
		},
		sheetConfirmRow: {
			flexDirection: 'row',
			gap: 10,
			marginTop: 12,
		},
		sheetCancel: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: t.shape.radius - 2,
			borderWidth: t.shape.borderWidth,
			borderColor: c.border,
		},
		sheetCancelText: {
			fontSize: 15,
			fontWeight: '600',
			color: c.onSurface,
		},
		sheetLeave: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: t.shape.radius - 2,
			backgroundColor: c.danger,
		},
		sheetLeaveText: {
			fontSize: 15,
			fontWeight: '600',
			color: c.onDanger,
		},
		sheetRowDestructive: {
			fontSize: 16,
			color: c.danger,
		},

		// Generic
		heading: {
			...ui.heading(t, 28),
			textAlign: 'center',
			marginBottom: 12,
		},
		message: {
			fontSize: 18,
			color: c.muted,
			textAlign: 'center',
			lineHeight: 26,
		},
	});
}

type Styles = ReturnType<typeof makeStyles>;

// Built once per theme and shared by every component on the screen
const styleCache = new Map<string, Styles>();

function stylesFor(t: Theme): Styles {
	let styles = styleCache.get(t.id);
	if (!styles) {
		styles = makeStyles(t);
		styleCache.set(t.id, styles);
	}
	return styles;
}

function useStyles(): Styles {
	return stylesFor(useTheme());
}
