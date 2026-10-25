import { useState, useEffect, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { metersBetween, paths, type Position } from '@grandcityrace/shared';
import { db } from '../../firebase';
import { listen } from '../../utils/listen';

// A teammate's position older than this doesn't count: their phone may be off
const FRESH_MS = 5 * 60_000;

// Whether the team has spread out further than the race allows, which
// blocks answering until they regroup. The server checks the same.
export function useTeamSpread(gameId: string, teamId: string, limit: number | null | undefined, now: number): boolean {
	const [positions, setPositions] = useState<Position[]>([]);

	useEffect(() => {
		if (!limit) {
			setPositions([]);
			return;
		}
		return listen(
			query(collection(db, paths.positions(gameId)), where('teamId', '==', teamId)),
			(snap) => setPositions(snap.docs.map((d) => d.data() as Position)),
		);
	}, [gameId, teamId, !!limit]);

	return useMemo(() => {
		if (!limit) return false;
		const fresh = positions.filter((p) => now - p.updatedAt < FRESH_MS);
		for (let i = 0; i < fresh.length; i++) {
			for (let j = i + 1; j < fresh.length; j++) {
				if (metersBetween(fresh[i], fresh[j]) > limit) return true;
			}
		}
		return false;
	}, [positions, limit, Math.floor(now / 30000)]);
}
