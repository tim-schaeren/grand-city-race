import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNewsFor, type ActivityEntry } from '@grandcityrace/shared';
import { db } from '../../firebase';
import { listen } from '../../utils/listen';

// The board, and how much of it is news to this player. `reading` is true
// while the board is open in front of them.
export function useActivityFeed(
	gameId: string | undefined,
	teamId: string | undefined,
	reading: boolean,
) {
	const [publicActivity, setPublicActivity] = useState<ActivityEntry[]>([]);
	const [teamActivity, setTeamActivity] = useState<ActivityEntry[]>([]);
	const [seenAt, setSeenAt] = useState(0);

	// Rules only allow a player to read public entries and their own team's,
	// so it takes two subscriptions rather than one unfiltered query
	useEffect(() => {
		if (!gameId) return;
		return onSnapshot(
			query(
				collection(db, 'games', gameId, 'activity'),
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
	}, [gameId]);

	// Team-only listeners retry: see listen()
	useEffect(() => {
		if (!gameId || !teamId) return;
		return listen(
			query(
				collection(db, 'games', gameId, 'activity'),
				where('teamId', '==', teamId),
				orderBy('at', 'desc'),
				limit(100),
			),
			(snap) =>
				setTeamActivity(
					snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityEntry),
				),
		);
	}, [gameId, teamId]);

	const activity = useMemo(() => {
		const byId = new Map<string, ActivityEntry>();
		[...publicActivity, ...teamActivity].forEach((e) => byId.set(e.id, e));
		return [...byId.values()].sort((a, b) => b.at - a.at).slice(0, 100);
	}, [publicActivity, teamActivity]);

	// Remember what has been read, so the badge survives a restart
	useEffect(() => {
		if (!gameId) return;
		AsyncStorage.getItem(`activitySeen:${gameId}`)
			.then((v) => setSeenAt(v ? Number(v) : 0))
			.catch(() => {});
	}, [gameId]);

	// Only other teams' actions and game-wide events count as news
	const newestNews = useMemo(() => {
		const news = activity.filter((e) => isNewsFor(e, teamId));
		return news.length ? news[0].at : 0;
	}, [activity, teamId]);

	// Mark the board as read while it is actually open, including entries that
	// arrive while the player is looking at it
	useEffect(() => {
		if (!reading || !gameId || newestNews <= seenAt) return;
		setSeenAt(newestNews);
		AsyncStorage.setItem(`activitySeen:${gameId}`, String(newestNews)).catch(() => {});
	}, [reading, newestNews, seenAt, gameId]);

	return { activity, seenAt, hasNews: newestNews > seenAt };
}
