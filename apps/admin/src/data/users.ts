import { collection, collectionGroup } from 'firebase/firestore';
import { type GamePlayer, type UserProfile } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';

// Across every game, so for platform admins only; the rules say the same

export function useUsers(enabled: boolean): Live<UserProfile[]> {
  return useLiveQuery(enabled ? 'users' : null, () => collection(db, 'users'), (id, data) => ({ ...data, id }) as UserProfile);
}

// Someone's place in a game: games/{gameId}/players/{uid}
export type Membership = GamePlayer & { gameId: string };

export function useMemberships(enabled: boolean): Live<Membership[]> {
  return useLiveQuery(
    enabled ? 'memberships' : null,
    () => collectionGroup(db, 'players'),
    (id, data, path) => ({ ...data, uid: id, gameId: path.split('/')[1] }) as Membership,
  );
}

// Every game's teams, by game and id
export function useAllTeamNames(enabled: boolean): Live<{ gameId: string; id: string; name: string }[]> {
  return useLiveQuery(
    enabled ? 'allTeams' : null,
    () => collectionGroup(db, 'teams'),
    (id, data, path) => ({ id, gameId: path.split('/')[1], name: data.name as string }),
  );
}
