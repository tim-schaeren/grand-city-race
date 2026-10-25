import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, documentId } from 'firebase/firestore';
import { metersBetween, type GeoPoint, type Game, type Team } from '@grandcityrace/shared';
import { db } from '../../firebase';
import { listen } from '../../utils/listen';

// Whether the team has spread out further than the race allows, which
// blocks answering until they regroup
export function useTeamSpread(team: Team | null, game: Game | null): boolean {
	const [positions, setPositions] = useState<Record<string, GeoPoint | null>>({});

	useEffect(() => {
		if (!team?.memberIds?.length || team.memberIds.length < 2) {
			setPositions({});
			return;
		}
		return listen(
			query(collection(db, 'users'), where(documentId(), 'in', team.memberIds)),
			(snap) => {
				const next: Record<string, GeoPoint | null> = {};
				snap.docs.forEach((d) => {
					next[d.id] = d.data().lastLocation ?? null;
				});
				setPositions(next);
			},
		);
	}, [JSON.stringify(team?.memberIds)]);

	return useMemo(() => {
		const limit = game?.maxTeamSpreadMeters;
		if (!limit) return false;
		const known = Object.values(positions).filter((p): p is GeoPoint => p !== null);
		for (let i = 0; i < known.length; i++) {
			for (let j = i + 1; j < known.length; j++) {
				if (metersBetween(known[i], known[j]) > limit) return true;
			}
		}
		return false;
	}, [positions, game?.maxTeamSpreadMeters]);
}
