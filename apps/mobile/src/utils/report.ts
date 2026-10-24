import { Linking } from 'react-native';
import { CONTACT_EMAIL, LEGAL } from '../config';
import { copy } from '@grandcityrace/shared';

// Opens a pre-filled email to us about the game the player is in, so a
// report arrives with what we need to find it. Without a mail app, the
// support page shows the address instead.
export async function reportProblem(context: {
	gameId?: string | null;
	gameName?: string | null;
	teamName?: string | null;
}) {
	const lines = [
		copy.report.whatHappened,
		'',
		'',
		'',
		copy.report.keepLines,
		copy.report.game(context.gameName, context.gameId),
		...(context.teamName ? [copy.report.team(context.teamName)] : []),
	];
	const subject = copy.report.subject(context.gameName);
	const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
	try {
		await Linking.openURL(url);
	} catch {
		Linking.openURL(LEGAL.support).catch(() => {});
	}
}
