import { useState } from 'react';
import {
	View,
	Text,
	Modal,
	ScrollView,
	TouchableOpacity,
	TextInput,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
	SHOP_ITEMS,
	type ShopConfig,
	type ShopItemDefinition,
	type ShopItemType,
	type Theme,
	copy,
	formatMinutesLeft,
} from '@grandcityrace/shared';
import Icon from '../theme/Icon';
import { useTheme } from '../theme/ThemeContext';
import * as ui from '../theme/primitives';

export interface ShopTarget {
	id: string;
	name: string;
	color?: string;
}

export default function ShopSheet({
	visible,
	onClose,
	shop,
	coins,
	shields,
	running,
	blocked,
	targets,
	onBuyForTeam,
	onUseOnTeam,
	buying,
}: {
	visible: boolean;
	onClose: () => void;
	shop: ShopConfig;
	coins: number;
	shields: number;
	running: Partial<Record<ShopItemType, number>>; // ms left on timed items
	blocked: Partial<Record<ShopItemType, string | null>>; // why it can't be bought now
	targets: ShopTarget[]; // the other teams
	onBuyForTeam: (type: ShopItemType) => Promise<void>;
	// Resolves to a sentence saying what happened; rejects with one too
	onUseOnTeam: (type: ShopItemType, teamId: string, amount?: number) => Promise<string>;
	buying: ShopItemType | null;
}) {
	const insets = useSafeAreaInsets();
	const theme = useTheme();
	const styles = stylesFor(theme);
	const { colors } = theme;
	const [aiming, setAiming] = useState<ShopItemType | null>(null);
	const [targetId, setTargetId] = useState<string | null>(null);
	const [amount, setAmount] = useState('');
	const [result, setResult] = useState<{ type: ShopItemType; text: string; failed: boolean } | null>(null);

	const items = SHOP_ITEMS.filter((item) => shop[item.type].enabled);

	function close() {
		setAiming(null);
		setTargetId(null);
		setAmount('');
		setResult(null);
		onClose();
	}

	async function useOnTeam(item: ShopItemDefinition) {
		if (!targetId) return;
		setResult(null);
		try {
			const gift = item.type === 'donate' ? parseInt(amount, 10) : undefined;
			const text = await onUseOnTeam(item.type, targetId, gift);
			setResult({ type: item.type, text, failed: false });
			setAiming(null);
			setTargetId(null);
			setAmount('');
		} catch (e) {
			setResult({ type: item.type, text: (e as Error).message, failed: true });
		}
	}

	function renderItem(item: ShopItemDefinition) {
		const config = shop[item.type];
		const msLeft = running[item.type] ?? 0;
		const reason = blocked[item.type] ?? null;
		const gift = item.type === 'donate' ? parseInt(amount, 10) || 0 : 0;
		const affordable = coins >= config.price + gift;
		const isAiming = aiming === item.type;
		const busy = buying === item.type;

		let note: string | null = null;
		if (msLeft > 0) note = copy.shop.running(formatMinutesLeft(msLeft));
		else if (reason) note = reason;
		else if (!affordable && !isAiming) note = copy.shop.needMore(config.price - coins);
		if (item.type === 'shield' && shields > 0 && !note) {
			note = copy.shop.shields(shields);
		}
		const canStart = msLeft <= 0 && !reason && coins >= config.price && !busy;

		return (
			<View key={item.type} style={styles.card}>
				<View style={styles.itemNameRow}>
					<Icon name={item.icon} size={20} color={colors.onSurface} />
					<Text style={styles.itemName}>{item.name}</Text>
					{config.sale && <Text style={styles.oldPrice}>{copy.shop.price(config.basePrice)}</Text>}
					<Text style={styles.price}>
						{copy.shop.price(config.price)}
					</Text>
				</View>
				{config.sale && (
					<Text style={styles.sale}>
						{copy.shop.sale(config.sale.percent, new Date(config.sale.until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
					</Text>
				)}
				<Text style={styles.itemText}>
					{item.description}
					{/* Robbery's minutes are its cooldown, not how long it lasts */}
					{config.durationMinutes > 0 && item.settings.durationMinutes && item.type !== 'robbery'
						? copy.shop.lasts(config.durationMinutes)
						: ''}
				</Text>

				{isAiming ? (
					<View style={styles.aim}>
						<Text style={styles.aimLabel}>
							{item.type === 'donate' ? copy.shop.giveTo : copy.shop.useOn}
						</Text>
						{targets.map((t) => (
							<TouchableOpacity
								key={t.id}
								style={[styles.targetRow, targetId === t.id && styles.targetRowChosen]}
								onPress={() => setTargetId(t.id)}
							>
								<View style={[styles.dot, { backgroundColor: t.color ?? colors.accent }]} />
								<Text style={styles.targetName}>{t.name}</Text>
								{targetId === t.id && <Icon name="check" size={18} color={colors.onSurface} />}
							</TouchableOpacity>
						))}
						{item.type === 'donate' && (
							<TextInput
								style={styles.amount}
								value={amount}
								onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
								placeholder={copy.shop.amount}
								placeholderTextColor={colors.mutedOnSurface}
								keyboardType="number-pad"
							/>
						)}
						<View style={styles.aimButtons}>
							<TouchableOpacity
								style={styles.cancel}
								onPress={() => {
									setAiming(null);
									setTargetId(null);
								}}
							>
								<Text style={styles.cancelText}>{copy.common.cancel}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.buyButton,
									{ flex: 1 },
									(!targetId || busy || !affordable || (item.type === 'donate' && gift <= 0)) &&
										styles.buyButtonDisabled,
								]}
								disabled={!targetId || busy || !affordable || (item.type === 'donate' && gift <= 0)}
								onPress={() => useOnTeam(item)}
							>
								<Text style={styles.buyButtonText}>
									{busy
										? copy.shop.working
										: item.type === 'donate'
											? copy.shop.give(gift)
											: item.name}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				) : (
					<View style={styles.itemFooter}>
						<Text style={styles.note}>{note ?? ''}</Text>
						<TouchableOpacity
							style={[styles.buyButton, !canStart && styles.buyButtonDisabled]}
							onPress={() => {
								setResult(null);
								if (item.targetsTeam) {
									setAiming(item.type);
									setTargetId(null);
								} else {
									onBuyForTeam(item.type).catch((e) =>
										setResult({ type: item.type, text: (e as Error).message, failed: true }),
									);
								}
							}}
							disabled={!canStart}
						>
							<Text style={styles.buyButtonText}>
								{msLeft > 0
								? copy.shop.active
								: busy
									? copy.shop.buying
									: item.targetsTeam
										? copy.shop.chooseTeam
										: copy.shop.buy}
							</Text>
						</TouchableOpacity>
					</View>
				)}
				{result?.type === item.type && (
					<Text style={[styles.result, result.failed && styles.resultFailed]}>{result.text}</Text>
				)}
			</View>
		);
	}

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={close}>
			<KeyboardAvoidingView
				style={styles.wrap}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<View style={[styles.header, { paddingTop: insets.top + 12 }]}>
					<Text style={styles.title}>{copy.shop.title}</Text>
					<TouchableOpacity onPress={close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
						<Icon name="close" size={26} color={colors.text} />
					</TouchableOpacity>
				</View>

				<ScrollView
					contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.balanceRow}>
						<Icon name="circle-multiple-outline" size={28} color={colors.text} />
						<Text style={styles.balance}>{coins}</Text>
						{shields > 0 && (
							<>
								<Icon name="shield-outline" size={24} color={colors.text} />
								<Text style={styles.balance}>{shields}</Text>
							</>
						)}
					</View>

					{items.length === 0 ? (
						<Text style={styles.empty}>{copy.shop.closed}</Text>
					) : (
						items.map(renderItem)
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</Modal>
	);
}

function makeStyles(t: Theme) {
	const c = t.colors;
	const edge = t.shape.shadowOffset > 0;
	return StyleSheet.create({
		wrap: {
			flex: 1,
			backgroundColor: c.background,
		},
		header: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 20,
			paddingBottom: 16,
			borderBottomWidth: edge ? t.shape.borderWidth : 1,
			borderBottomColor: c.border,
		},
		title: ui.heading(t, 22),
		body: {
			paddingHorizontal: 16,
			paddingTop: 20,
			gap: 12,
		},
		balanceRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			marginBottom: 8,
		},
		balance: {
			fontFamily: t.fonts.display,
			fontSize: 30,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.text,
			marginRight: 8,
		},
		empty: {
			fontSize: 15,
			color: c.muted,
			textAlign: 'center',
			marginTop: 24,
		},
		card: {
			...ui.panel(t),
			borderColor: c.border,
			borderWidth: edge ? t.shape.borderWidth : 1,
			backgroundColor: edge ? c.surface : c.background,
			padding: 16,
		},
		itemNameRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 6,
		},
		itemName: {
			flex: 1,
			fontFamily: t.fonts.display,
			fontSize: 18,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.onSurface,
		},
		price: {
			fontSize: 15,
			fontWeight: '700',
			color: c.onSurface,
		},
		// A flash sale: the price before it, struck through, and when it ends
		oldPrice: {
			fontSize: 13,
			color: c.mutedOnSurface,
			textDecorationLine: 'line-through',
		},
		sale: {
			fontSize: 13,
			fontWeight: '700',
			color: c.onSurface,
			marginTop: 2,
		},
		itemText: {
			fontSize: 14,
			color: c.mutedOnSurface,
			lineHeight: 20,
		},
		itemFooter: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 12,
			marginTop: 14,
		},
		note: {
			flex: 1,
			fontSize: 13,
			color: c.mutedOnSurface,
		},
		buyButton: {
			...ui.button(t),
			paddingHorizontal: 20,
			paddingVertical: 10,
		},
		buyButtonDisabled: {
			opacity: 0.35,
		},
		buyButtonText: {
			...ui.buttonText(t),
			fontSize: 15,
		},
		aim: {
			marginTop: 14,
			gap: 8,
		},
		aimLabel: {
			...ui.label(t),
			fontSize: 12,
			letterSpacing: 2,
			color: c.onSurface,
		},
		targetRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 10,
			paddingHorizontal: 12,
			paddingVertical: 12,
			borderRadius: t.shape.radius,
			borderWidth: 1.5,
			borderColor: c.border,
		},
		targetRowChosen: {
			borderColor: c.accent,
			borderWidth: 3,
		},
		dot: {
			width: 14,
			height: 14,
			borderRadius: 7,
		},
		targetName: {
			flex: 1,
			fontSize: 16,
			fontWeight: '600',
			color: c.onSurface,
		},
		amount: {
			...ui.input(t),
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 16,
		},
		aimButtons: {
			flexDirection: 'row',
			gap: 10,
			marginTop: 4,
		},
		cancel: {
			...ui.outlineButton(t),
			borderColor: c.border,
			paddingHorizontal: 18,
			paddingVertical: 10,
		},
		cancelText: {
			fontSize: 15,
			fontWeight: '600',
			color: c.onSurface,
		},
		result: {
			marginTop: 10,
			fontSize: 14,
			fontWeight: '600',
			color: c.success,
		},
		resultFailed: {
			color: c.danger,
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
