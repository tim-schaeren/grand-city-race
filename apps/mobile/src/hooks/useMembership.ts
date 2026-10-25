import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, doc, onSnapshot, query, where } from 'firebase/firestore';
import { paths, type GamePlayer } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useAuth } from './useAuth';

export interface Membership {
	gameId: string;
	teamId: string | null;
}

// The game this player is in, from their entries on games' player lists.
// Someone can be in several; the app shows the most recently joined one
// that isn't over, or else the most recent one, for its recap.
export function useMembership() {
	const { user } = useAuth();
	const [entries, setEntries] = useState<(GamePlayer & { gameId: string })[] | null>(null);
	const [ended, setEnded] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (!user) {
			setEntries([]);
			return;
		}
		return onSnapshot(
			query(collectionGroup(db, 'players'), where('uid', '==', user.uid)),
			(snap) =>
				setEntries(
					snap.docs.map((d) => ({ ...(d.data() as GamePlayer), gameId: d.ref.parent.parent!.id })),
				),
			() => setEntries([]),
		);
	}, [user?.uid]);

	const gameIds = (entries ?? []).map((e) => e.gameId).sort().join(',');
	useEffect(() => {
		if (!gameIds) return;
		const stops = gameIds.split(',').map((gameId) =>
			onSnapshot(
				doc(db, paths.game(gameId)),
				(snap) => setEnded((prev) => ({ ...prev, [gameId]: !!snap.get('endedAt') })),
				() => {},
			),
		);
		return () => stops.forEach((stop) => stop());
	}, [gameIds]);

	const membership = useMemo<Membership | null>(() => {
		if (!entries?.length) return null;
		const newest = [...entries].sort((a, b) => b.joinedAt - a.joinedAt);
		const current = newest.find((e) => ended[e.gameId] === false) ?? newest[0];
		return { gameId: current.gameId, teamId: current.teamId };
	}, [entries, ended]);

	return { membership, loading: entries === null };
}
