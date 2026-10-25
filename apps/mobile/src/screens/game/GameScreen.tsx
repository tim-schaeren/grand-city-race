import { useState, useRef, useEffect } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
	gameEconomy,
	shopConfig,
	compassMsLeft,
	radarMsLeft,
	curseMsLeft,
	teamCoins,
	bearingDegrees,
	pausedMsNow,
	themeFor,
	copy,
	type ShopItemType,
} from '@grandcityrace/shared';
import { auth } from '../../firebase';
import { useUser } from '../../hooks/useUser';
import { reportProblem } from '../../utils/report';
import ShopSheet from '../../components/ShopSheet';
import DeleteAccountModal from '../../components/DeleteAccountModal';
import PermissionsIntro from '../../components/PermissionsIntro';
import Icon from '../../theme/Icon';
import { ThemeProvider } from '../../theme/ThemeContext';
import * as actions from './actions';
import { useGameData, useNow } from './useGameData';
import { useActivityFeed } from './useActivityFeed';
import { useTeamChat } from './useTeamChat';
import { useLocationTracking } from './useLocationTracking';
import { useTeamSpread } from './useTeamSpread';
import { useHeading } from './useHeading';
import { useQuestProgress } from './useQuestProgress';
import { NavigationView, DistanceView } from './FindingViews';
import { TimerView, InfoView, QuestView } from './QuestViews';
import {
	WaitingView,
	FinishedView,
	PausedView,
	EndedView,
	CursedView,
	LocationDeniedView,
	SpreadOverlay,
	CelebrationOverlay,
} from './StatusViews';
import { GameSheet, type SheetTab } from './GameSheet';
import { ProfileButton, ProfileSheet } from './ProfileSheet';
import { stylesFor } from './styles';

export default function GameScreen({ gameId, teamId }: { gameId: string; teamId: string }) {
	const { game, team, state, allTeams } = useGameData(gameId, teamId);
	const now = useNow();
	const { profile } = useUser();
	const insets = useSafeAreaInsets();

	const [answer, setAnswer] = useState('');
	const [wrong, setWrong] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [celebrating, setCelebrating] = useState(false);
	const celebrateAnim = useRef(new Animated.Value(0)).current;

	const [sheetOpen, setSheetOpen] = useState(false);
	const [sheetTab, setSheetTab] = useState<SheetTab>('activity');
	const [highlightSince, setHighlightSince] = useState(0);
	const [draft, setDraft] = useState('');
	const [sendingMessage, setSendingMessage] = useState(false);
	const [shopOpen, setShopOpen] = useState(false);
	const [buyingItem, setBuyingItem] = useState<ShopItemType | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);
	const [leavingGame, setLeavingGame] = useState(false);
	const [deletingAccount, setDeletingAccount] = useState(false);

	// This component loads the game, so it reads the theme directly; everything
	// it renders gets it through the provider below
	const theme = themeFor(game?.themeId);
	const styles = stylesFor(theme);

	const feed = useActivityFeed(gameId, teamId, sheetOpen && sheetTab === 'activity');
	const chat = useTeamChat(gameId, teamId, state, sheetOpen && sheetTab === 'chat');
	const location = useLocationTracking(team, game, now);
	const spreadTooLarge = useTeamSpread(gameId, teamId, game?.maxTeamSpreadMeters, now);

	const gameRunning =
		!!game &&
		!!team &&
		!game.endedAt &&
		!game.pausedAt &&
		!team.finishedAt &&
		now >= game.startDateTime;
	const cursedLeft = curseMsLeft(state, now);
	const cursed = cursedLeft > 0;
	const quest = state?.quest ?? null;

	const { unlocked, distanceToQuest, walkedMeters } = useQuestProgress({
		gameId,
		view: quest,
		coords: location.coords,
		active: gameRunning && !cursed,
	});

	const economy = gameEconomy(game);
	const shop = shopConfig(game);
	const coins = teamCoins(state, economy);
	const compassLeft = compassMsLeft(state, now);
	const radarLeft = radarMsLeft(state, now);
	const { heading, uncalibrated } = useHeading(compassLeft > 0);

	// Opening the screen sets the clock by the server's; once the race runs,
	// the server puts the team on its quest
	useEffect(() => {
		actions.sync(gameId).catch(() => {});
	}, [gameId]);
	const needsQuest = gameRunning && !quest && (game?.questOrder?.length ?? 0) > 0;
	useEffect(() => {
		if (!needsQuest) return;
		actions.sync(gameId).catch(() => {});
		// Asked again if the first answer didn't arrive
		const id = setInterval(() => actions.sync(gameId).catch(() => {}), 10_000);
		return () => clearInterval(id);
	}, [needsQuest, gameId]);

	// A new quest starts with a clean slate
	useEffect(() => {
		setNotice(null);
		setAnswer('');
	}, [quest?.questId]);

	function openSheet(tab: SheetTab) {
		// Freeze what counts as new for this viewing, so rows stay marked while being read
		setHighlightSince(feed.seenAt);
		setSheetTab(tab);
		setSheetOpen(true);
	}

	function sendMessage() {
		const text = draft.trim();
		if (!text || sendingMessage) return;
		setSendingMessage(true);
		setDraft('');
		actions
			.sendMessage(
				gameId,
				teamId,
				auth.currentUser?.uid ?? '',
				profile?.name ?? copy.common.namelessPlayer,
				text,
			)
			.catch(() => setDraft(text))
			.finally(() => setSendingMessage(false));
	}

	async function leaveGame() {
		if (leavingGame) return;
		setLeavingGame(true);
		try {
			await actions.leaveGame(gameId);
		} catch {
			setLeavingGame(false);
		}
	}

	// Why each item can't be bought right now, if it can't. Nothing is for
	// sale once a team has finished, or while it is cursed. The compass and
	// radar only have a job while the team is still looking for a place.
	const otherTeams = allTeams.filter((t) => t.id !== teamId);
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
			: quest.unlockedAt
				? copy.shop.alreadyThere
				: null;
	const noTargets = otherTeams.length ? null : copy.shop.noOtherTeams;
	const itemBlocked: Partial<Record<ShopItemType, string | null>> = {
		compass: shopClosed ?? findingBlocked,
		radar: shopClosed ?? findingBlocked,
		shield: shopClosed,
		curse: shopClosed ?? noTargets,
		robbery: shopClosed ?? noTargets,
		donate: shopClosed ?? noTargets,
	};
	const itemRunning: Partial<Record<ShopItemType, number>> = {
		compass: compassLeft,
		radar: radarLeft,
	};

	// Resolves once bought; a refusal or a lost connection rejects with a sentence to show
	async function buyForTeam(type: ShopItemType) {
		if (buyingItem || itemBlocked[type]) return;
		if (coins < shop[type].price || (itemRunning[type] ?? 0) > 0) return;
		setBuyingItem(type);
		try {
			await actions.buyItem(gameId, type);
			// Back to the hint, where the arrow or the radar now helps
			if (type === 'compass' || type === 'radar') setShopOpen(false);
		} finally {
			setBuyingItem(null);
		}
	}

	async function useOnTeam(type: ShopItemType, targetTeamId: string, amount?: number) {
		setBuyingItem(type);
		try {
			return await actions.applyItemTo(gameId, type, targetTeamId, shop, amount);
		} finally {
			setBuyingItem(null);
		}
	}

	function revealHint() {
		if (!quest || quest.hints.length >= quest.hintCount || coins < economy.hintCost) return;
		actions.revealHint(gameId, quest.questId, quest.hints.length + 1).catch((e) => setNotice(e.message));
	}

	function continueQuest() {
		if (!quest || submitting) return;
		setSubmitting(true);
		actions.continueQuest(gameId, quest.questId).catch((e) => setNotice(e.message));
		// Brief lockout so a double tap can't also complete the next quest
		setTimeout(() => setSubmitting(false), 1000);
	}

	function celebrate() {
		setCelebrating(true);
		Animated.spring(celebrateAnim, { toValue: 1, useNativeDriver: true }).start();
		setTimeout(() => {
			setCelebrating(false);
			celebrateAnim.setValue(0);
		}, 2000);
	}

	// The server checks the answer
	async function submitAnswer() {
		const text = answer.trim();
		if (!quest || submitting || cursed || !text || spreadTooLarge) return;
		setSubmitting(true);
		setNotice(null);
		try {
			const result = await actions.answer(gameId, quest.questId, text, location.coords);
			if (!result.correct) {
				setWrong(true);
				setTimeout(() => setWrong(false), 2000);
			} else {
				setAnswer('');
				celebrate();
			}
		} catch (e) {
			setNotice((e as Error).message);
		} finally {
			setSubmitting(false);
		}
	}

	// ── Render ────────────────────────────────────────────────────────────────

	const userName = profile?.name ?? '';

	function renderContent() {
		if (location.denied) return <LocationDeniedView />;
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
				<CursedView by={state?.cursedByName ?? copy.cursed.anotherTeam} msLeft={cursedLeft} />
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
					{game.questOrder?.length ? (
						<ActivityIndicator size="large" color={theme.colors.text} />
					) : (
						<Text style={styles.message}>{copy.quest.none}</Text>
					)}
				</View>
			);
		}

		const questNumber = game.questOrder.indexOf(quest.questId) + 1;
		const totalQuests = game.questOrder.length;

		if (!unlocked) {
			if (quest.trigger === 'distance')
				return <DistanceView quest={quest} meters={walkedMeters} />;
			const { coords } = location;
			return (
				<NavigationView
					quest={quest}
					distance={distanceToQuest}
					bearing={coords && quest.location ? bearingDegrees(coords, quest.location) : null}
					heading={heading}
					headingUncalibrated={uncalibrated}
					compassMsLeft={compassLeft}
					radarMsLeft={radarLeft}
				/>
			);
		}

		if (quest.task === 'timer') {
			const elapsed = quest.unlockedAt
				? now - quest.unlockedAt - (pausedMsNow(game, now) - quest.pausedMsAtUnlock)
				: 0;
			return (
				<TimerView
					quest={quest}
					questNumber={questNumber}
					totalQuests={totalQuests}
					remainingMs={(quest.durationSeconds ?? 0) * 1000 - elapsed}
					submitting={submitting}
					notice={notice}
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
					notice={notice}
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
					notice={notice}
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
						<Icon name="circle-multiple-outline" size={16} color={theme.colors.onSurface} />
						<Text style={styles.coinPillText}>{coins}</Text>
						{compassLeft > 0 && (
							<Icon name="compass-outline" size={16} color={theme.colors.onSurface} />
						)}
						{radarLeft > 0 && <Icon name="radar" size={16} color={theme.colors.onSurface} />}
						{(state?.shields ?? 0) > 0 && (
							<Icon name="shield-outline" size={16} color={theme.colors.onSurface} />
						)}
					</TouchableOpacity>
				)}
				<TouchableOpacity
					style={[styles.roundButton, styles.lbIconButton, { top: insets.top + 8 }]}
					onPress={() => openSheet('activity')}
				>
					<Icon name="menu" size={20} color={theme.colors.onAccent} />
					{(feed.hasNews || chat.unread > 0) && <View style={styles.unreadDot} />}
				</TouchableOpacity>
				<ProfileButton
					name={userName}
					top={insets.top + 8}
					onPress={() => setProfileOpen(true)}
				/>
				<ShopSheet
					visible={shopOpen}
					onClose={() => setShopOpen(false)}
					shop={shop}
					coins={coins}
					shields={state?.shields ?? 0}
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
						reportProblem({ gameId, gameName: game?.name, teamName: team?.name });
					}}
					onClose={() => setProfileOpen(false)}
				/>
				<DeleteAccountModal
					visible={deletingAccount}
					onClose={() => setDeletingAccount(false)}
				/>
				<PermissionsIntro
					visible={location.introVisible}
					onContinue={() => location.finishIntro(true)}
				/>
				{game && (
					<GameSheet
						visible={sheetOpen}
						onClose={() => setSheetOpen(false)}
						game={game}
						allTeams={allTeams}
						currentTeamId={teamId}
						activity={feed.activity}
						tab={sheetTab}
						onTabChange={setSheetTab}
						highlightSince={highlightSince}
						messages={chat.messages}
						chatUnread={chat.unread}
						draft={draft}
						setDraft={setDraft}
						onSend={sendMessage}
						sending={sendingMessage}
						teamReadAt={state?.teamChatReadAt ?? 0}
						hostReadAt={state?.hostChatReadAt ?? 0}
					/>
				)}
			</View>
		</ThemeProvider>
	);
}
