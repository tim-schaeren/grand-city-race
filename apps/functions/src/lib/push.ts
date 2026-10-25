import { paths } from '@grandcityrace/shared';
import { db } from './firebase';

// Push to some players, on every phone they've signed in on. Tokens stay on
// their profiles; nobody but the server reads them.
export async function pushToPlayers(uids: string[], title: string, body: string) {
  const ids = [...new Set(uids)].filter(Boolean);
  if (!ids.length) return;
  const profiles = await db.getAll(...ids.map(uid => db.doc(paths.user(uid))));
  const tokens = new Set<string>();
  for (const profile of profiles) {
    for (const token of (profile.get('pushTokens') as string[] | undefined) ?? []) tokens.add(token);
  }
  if (!tokens.size) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify([...tokens].map(to => ({ to, title, body, sound: 'default' }))),
  }).catch(() => {});
}

// Everyone on a team in this game
export async function teamMemberIds(gameId: string, teamId?: string | null): Promise<string[]> {
  if (teamId) {
    const team = await db.doc(paths.team(gameId, teamId)).get();
    return (team.get('memberIds') as string[] | undefined) ?? [];
  }
  const teams = await db.collection(paths.teams(gameId)).get();
  return teams.docs.flatMap(t => (t.get('memberIds') as string[] | undefined) ?? []);
}
