import { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Linking,
	Modal,
	ScrollView,
	KeyboardAvoidingView,
	Keyboard,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
	copy,
	formatActivity,
	formatActivityTime,
	formatDuration,
	isNewsFor,
	raceTimeMs,
	type ActivityEntry,
	type ChatMessage,
	type Game,
	type Team,
} from '@grandcityrace/shared';
import Icon from '../../theme/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { useStyles } from './styles';

// The menu sheet: what's happening, the chat with the hosts, the standings

export type SheetTab = 'activity' | 'chat' | 'leaderboard';

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

export function GameSheet({
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
						{tab === 'leaderboard' && (
							<Standings game={game} allTeams={allTeams} currentTeamId={currentTeamId} />
						)}
					</ScrollView>
				)}
			</KeyboardAvoidingView>
		</Modal>
	);
}

// First the finished teams in the order they finished, then the rest by
// quests solved
function Standings({
	game,
	allTeams,
	currentTeamId,
}: {
	game: Game;
	allTeams: Team[];
	currentTeamId: string;
}) {
	const styles = useStyles();
	const sorted = [...allTeams].sort((a, b) => {
		if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
		if (a.finishedAt) return -1;
		if (b.finishedAt) return 1;
		return (b.solvedCount ?? 0) - (a.solvedCount ?? 0);
	});
	const totalQuests = game.questOrder.length;
	return (
		<>
			{sorted.map((t, i) => {
				const isCurrent = t.id === currentTeamId;
				const completed = t.solvedCount ?? 0;
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
		</>
	);
}
