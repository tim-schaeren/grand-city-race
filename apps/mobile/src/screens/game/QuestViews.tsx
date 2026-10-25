import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { copy, type QuestView as Quest, type QuestHint } from '@grandcityrace/shared';
import ContentBlocks from '../../components/ContentBlocks';
import Icon from '../../theme/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { Countdown, ContinueButton, ScrollContainer } from './parts';
import { useStyles } from './styles';

// An unlocked quest: an answer to find, a countdown to sit out, or something to read

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
				blocks={quest.description ?? []}
				textStyle={styles.questDescription}
			/>
		</>
	);
}


export function TimerView({
	quest,
	questNumber,
	totalQuests,
	remainingMs,
	submitting,
	notice,
	onContinue,
}: {
	quest: Quest;
	questNumber: number;
	totalQuests: number;
	remainingMs: number;
	submitting: boolean;
	notice: string | null;
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
			{notice && <Text style={styles.wrongText}>{notice}</Text>}
		</ScrollContainer>
	);
}

export function InfoView({
	quest,
	questNumber,
	totalQuests,
	submitting,
	notice,
	onContinue,
}: {
	quest: Quest;
	questNumber: number;
	totalQuests: number;
	submitting: boolean;
	notice: string | null;
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
			{notice && <Text style={styles.wrongText}>{notice}</Text>}
		</ScrollContainer>
	);
}

// The hints paid for, and a button for the next one while there is one
function HintSection({
	hints,
	total,
	cost,
	coins,
	onReveal,
}: {
	hints: QuestHint[];
	total: number;
	cost: number;
	coins: number;
	onReveal: () => void;
}) {
	const styles = useStyles();
	if (!total) return null;
	const revealed = hints.length;
	const affordable = coins >= cost;
	return (
		<View style={styles.hintSection}>
			{hints.map((hint, i) => (
				<View key={i} style={styles.hintCard}>
					<Text style={styles.hintLabel}>{copy.hints.label(i + 1)}</Text>
					<ContentBlocks blocks={hint.blocks} textStyle={styles.hintText} />
				</View>
			))}
			{revealed < total && (
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

export function QuestView({
	quest,
	questNumber,
	totalQuests,
	answer,
	setAnswer,
	wrong,
	submitting,
	onSubmit,
	notice,
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
	notice: string | null;
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

				{wrong ? (
					<Text style={styles.wrongText}>{copy.quest.wrong}</Text>
				) : notice ? (
					<Text style={styles.wrongText}>{notice}</Text>
				) : null}

				<HintSection
					hints={quest.hints}
					total={quest.hintCount}
					cost={hintCost}
					coins={coins}
					onReveal={onRevealHint}
				/>
			</ScrollContainer>
		</KeyboardAvoidingView>
	);
}
