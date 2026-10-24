import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type { Theme } from '@grandcityrace/shared';

// The building blocks every screen draws from, so a theme is one decision
// rather than a hundred colour edits.

// Display type. In themes whose heading colour can't hold contrast alone, a
// hard shadow outlines each letter — printed-poster style, legible with it.
export function heading(t: Theme, fontSize: number): TextStyle {
	return {
		fontFamily: t.fonts.display,
		fontSize: fontSize * t.fonts.scale,
		fontWeight: t.fonts.display ? 'normal' : '700',
		color: t.colors.heading,
		textTransform: t.uppercaseHeadings ? 'uppercase' : 'none',
		letterSpacing: t.uppercaseHeadings ? 1 : 0,
		...(t.headingShadow
			? {
					textShadowColor: t.colors.shadow,
					textShadowOffset: { width: 2, height: 2 },
					// Android drops a zero-radius shadow entirely
					textShadowRadius: Platform.OS === 'android' ? 1 : 0,
				}
			: null),
	};
}

// Small spaced-out labels above content ("FIND YOUR NEXT QUEST")
export function label(t: Theme): TextStyle {
	return {
		fontFamily: t.fonts.display,
		fontSize: 14,
		fontWeight: t.fonts.display ? 'normal' : '700',
		letterSpacing: 3,
		color: t.uppercaseHeadings ? t.colors.text : t.colors.muted,
		textTransform: 'uppercase',
	};
}

// A hard offset edge, drawn with thicker right and bottom borders. Real shadow
// props can't do a crisp offset on Android, but borders can on both platforms.
function edge(t: Theme): ViewStyle {
	const { borderWidth, shadowOffset } = t.shape;
	if (!shadowOffset) return { borderWidth };
	return {
		borderWidth,
		borderRightWidth: borderWidth + shadowOffset,
		borderBottomWidth: borderWidth + shadowOffset,
	};
}

export function panel(t: Theme): ViewStyle {
	return {
		backgroundColor: t.colors.surface,
		borderColor: t.shape.shadowOffset ? t.colors.border : t.colors.surface,
		borderRadius: t.shape.radius,
		...edge(t),
	};
}

export function button(t: Theme): ViewStyle {
	return {
		backgroundColor: t.colors.accent,
		borderColor: t.colors.accent,
		borderRadius: t.shape.radius,
		alignItems: 'center',
		justifyContent: 'center',
		...(t.shape.shadowOffset ? { borderColor: t.colors.shadow } : null),
		...edge(t),
	};
}

export function buttonText(t: Theme): TextStyle {
	return {
		fontFamily: t.fonts.display,
		color: t.colors.onAccent,
		fontSize: 16,
		fontWeight: t.fonts.display ? 'normal' : '600',
		textTransform: t.uppercaseHeadings ? 'uppercase' : 'none',
		letterSpacing: t.uppercaseHeadings ? 1 : 0,
	};
}

// A button drawn as an outline on the background rather than a filled block
export function outlineButton(t: Theme): ViewStyle {
	return {
		borderColor: t.colors.border,
		borderRadius: t.shape.radius,
		borderWidth: t.shape.borderWidth,
		alignItems: 'center',
		justifyContent: 'center',
	};
}

export function input(t: Theme): ViewStyle & TextStyle {
	return {
		backgroundColor: t.colors.surface,
		color: t.colors.onSurface,
		borderColor: t.colors.border,
		borderWidth: t.shape.borderWidth,
		borderRadius: t.shape.radius,
		// Explicit, so a placeholder never inherits a label's tracking
		letterSpacing: 0,
	};
}
