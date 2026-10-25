import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { normalizeQuest, type Game, type Quest, type Team } from '@grandcityrace/shared';
import { db } from '../../firebase';

// The player's team, its game, every team in it, and the quest the team is on
export function useGameData(teamId: string) {
	const [team, setTeam] = useState<Team | null>(null);
	const [game, setGame] = useState<Game | null>(null);
	const [allTeams, setAllTeams] = useState<Team[]>([]);
	const [quest, setQuest] = useState<Quest | null>(null);

	useEffect(() => {
		return onSnapshot(doc(db, 'teams', teamId), (snap) => {
			setTeam(snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null);
		});
	}, [teamId]);

	useEffect(() => {
		if (!team?.gameId) return;
		return onSnapshot(doc(db, 'games', team.gameId), (snap) => {
			setGame(snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null);
		});
	}, [team?.gameId]);

	// For the standings and the placement at the finish
	useEffect(() => {
		if (!game?.id) return;
		return onSnapshot(
			query(collection(db, 'teams'), where('gameId', '==', game.id)),
			(snap) =>
				setAllTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team)),
		);
	}, [game?.id]);

	const currentQuestId = team?.currentQuestId ?? game?.questOrder?.[0] ?? null;
	useEffect(() => {
		if (!game?.id || !currentQuestId) {
			setQuest(null);
			return;
		}
		return onSnapshot(
			doc(db, 'games', game.id, 'quests', currentQuestId),
			(snap) => {
				setQuest(snap.exists() ? normalizeQuest(snap.id, snap.data()) : null);
			},
		);
	}, [game?.id, currentQuestId]);

	return { team, game, allTeams, quest };
}

// The time, once a second, for countdowns and items running out
export function useNow() {
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);
	return now;
}
