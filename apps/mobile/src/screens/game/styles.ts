import { StyleSheet } from 'react-native';
import type { Theme } from '@grandcityrace/shared';
import { useTheme } from '../../theme/ThemeContext';
import * as ui from '../../theme/primitives';

// The game screen's look, for every theme. Every view on the screen shares it.

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
		// The note that this is a test run, not the race
		testBanner: {
			position: 'absolute',
			left: 16,
			right: 16,
			paddingVertical: 6,
			paddingHorizontal: 12,
			borderRadius: t.shape.radius,
			backgroundColor: t.colors.surface,
			borderWidth: 1,
			borderColor: t.colors.border,
		},
		testBannerText: {
			color: t.colors.muted,
			fontSize: 12,
			textAlign: 'center',
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

export function stylesFor(t: Theme): Styles {
	let styles = styleCache.get(t.id);
	if (!styles) {
		styles = makeStyles(t);
		styleCache.set(t.id, styles);
	}
	return styles;
}

export function useStyles(): Styles {
	return stylesFor(useTheme());
}
