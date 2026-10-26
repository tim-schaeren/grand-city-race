import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { copy, parseTestLink } from '@grandcityrace/shared';
import { play } from '../utils/api';

// Links already acted on: the link the app was opened with stays the
// app's first link for as long as it runs
const handled = new Set<string>();

// A host's test link (see testRun.ts in the shared package) puts whoever is
// signed in on the game's test team; the app then shows that game
export function useTestLink() {
	useEffect(() => {
		const open = (url: string | null) => {
			const link = url ? parseTestLink(url) : null;
			if (!url || !link || handled.has(url)) return;
			handled.add(url);
			play('joinTest', link).catch((e) => Alert.alert(copy.test.joinFailed, (e as Error).message));
		};
		Linking.getInitialURL().then(open).catch(() => {});
		const sub = Linking.addEventListener('url', (e) => open(e.url));
		return () => sub.remove();
	}, []);
}
