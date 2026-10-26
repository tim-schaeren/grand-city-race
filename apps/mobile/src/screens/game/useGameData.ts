import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { isTestTeam, paths, type Game, type Team, type TeamState } from '@grandcityrace/shared';
import { db } from '../../firebase';
import { listen } from '../../utils/listen';
import { serverNow } from '../../utils/api';

// The player's game, their team as everyone sees it, the team's private
// state (coins, items, and the quest it is on), and every team in the game
export function useGameData(gameId: string, teamId: string) {
	const [game, setGame] = useState<Game | null>(null);
	const [team, setTeam] = useState<Team | null>(null);
	const [state, setState] = useState<TeamState | null>(null);
	const [allTeams, setAllTeams] = useState<Team[]>([]);

	useEffect(
		() => onSnapshot(doc(db, paths.game(gameId)), (snap) => {
			setGame(snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null);
		}),
		[gameId],
	);

	useEffect(
		() => onSnapshot(doc(db, paths.team(gameId, teamId)), (snap) => {
			setTeam(snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null);
		}),
		[gameId, teamId],
	);

	// Team-only, so it retries: see listen()
	useEffect(
		() => listen(doc(db, paths.teamState(gameId, teamId)), (snap) => {
			setState(snap.exists() ? (snap.data() as TeamState) : null);
		}),
		[gameId, teamId],
	);

	// For the standings, the placement at the finish and the shop's targets.
	// A test run's team sees only its rival; everyone else, only the race's teams.
	useEffect(
		() => onSnapshot(collection(db, paths.teams(gameId)), (snap) =>
			setAllTeams(
				snap.docs
					.map((d) => ({ id: d.id, ...d.data() }) as Team)
					.filter((t) => isTestTeam(t.id) === isTestTeam(teamId)),
			),
		),
		[gameId, teamId],
	);

	return { game, team, state, allTeams };
}

// The time by the server's clock, once a second, for countdowns and items
// running out
export function useNow() {
	const [now, setNow] = useState(serverNow());
	useEffect(() => {
		const id = setInterval(() => setNow(serverNow()), 1000);
		return () => clearInterval(id);
	}, []);
	return now;
}
