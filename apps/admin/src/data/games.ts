import { collection, query, where } from 'firebase/firestore';
import { hasStarted, paths, type Game } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveDoc, useLiveQuery, type Live } from './live';

export type GameWithId = Game & { id: string };

const readGame = (id: string, data: object) => ({ id, ...data }) as GameWithId;

export function useGame(gameId: string | undefined): Live<GameWithId | null> {
  return useLiveDoc(gameId ? paths.game(gameId) : null, readGame);
}

// The games someone runs; platform admins run every game
export function useMyGames(uid: string | undefined, isAdmin: boolean): Live<GameWithId[]> {
  return useLiveQuery(
    uid ? `${uid}:${isAdmin}` : null,
    () => {
      const games = collection(db, paths.games());
      return isAdmin ? query(games) : query(games, where('hostIds', 'array-contains', uid));
    },
    readGame,
  );
}

export type GamePhase = 'prepare' | 'race' | 'after';

// Where a game is: before its start, running or paused, or over
export function phaseOf(game: Pick<Game, 'startDateTime' | 'startHeld' | 'endedAt' | 'pausedAt'>, now: number): GamePhase {
  if (game.endedAt) return 'after';
  if (game.pausedAt || hasStarted(game, now)) return 'race';
  return 'prepare';
}
