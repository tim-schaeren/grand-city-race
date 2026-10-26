import { useMemo } from 'react';
import { collection, collectionGroup, query, where } from 'firebase/firestore';
import { isTestTeam, paths, type Team, type TeamState } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';

// A team as a host sees it: what everyone sees, with its private state merged
// in. A test run's teams only show on the Test run page.
export type HostTeam = Team & Partial<TeamState>;

export function useTeams(gameId: string | undefined): Live<HostTeam[]> {
  const teams = useLiveQuery(
    gameId ? `teams:${gameId}` : null,
    () => collection(db, paths.teams(gameId!)),
    (id, data) => ({ id, ...data }) as Team,
  );
  const states = useLiveQuery(
    gameId ? `states:${gameId}` : null,
    () => query(collectionGroup(db, 'private'), where('gameId', '==', gameId)),
    (_, data) => data as TeamState,
  );
  return useMemo<Live<HostTeam[]>>(() => {
    if (teams.status !== 'ready') return teams;
    if (states.status === 'error') return states;
    // The teams are worth showing even before their private state arrives
    const byId = new Map((states.status === 'ready' ? states.data : []).map(s => [s.teamId, s]));
    return { status: 'ready', data: teams.data.filter(t => !isTestTeam(t.id)).map(t => ({ ...byId.get(t.id), ...t })) };
  }, [teams, states]);
}
