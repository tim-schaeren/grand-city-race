import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { consoleCopy as cc, type UserProfile } from '@grandcityrace/shared';
import { useAuth } from '../hooks/useAuth';
import { useMyGames } from '../data/games';
import { dataOr } from '../data/live';
import { useAllTeamNames, useMemberships, useUsers, type Membership } from '../data/users';
import { to } from '../shell/to';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TextInput } from '../ui/Field';
import { Page } from '../ui/Page';
import { Empty, Show } from '../ui/States';
import { admin } from '../utils/api';

type Change = 'delete' | 'admin' | 'unadmin';

// Everyone with an account, for platform admins: the games they host and
// play in, admin rights, and deleting an account for someone who can't do it
// from the app. Admin is a claim on the sign-in, so it's granted through the
// server.
export default function UsersPage() {
  const { isAdmin, user: me } = useAuth();
  const users = useUsers(isAdmin);
  const memberships = dataOr(useMemberships(isAdmin), [] as Membership[]);
  const teams = dataOr(useAllTeamNames(isAdmin), []);
  const games = dataOr(useMyGames(me?.uid, isAdmin), []);
  const [admins, setAdmins] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [asking, setAsking] = useState<{ kind: Change; user: UserProfile } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    admin('listAdmins', {}).then(r => setAdmins((r as { uids: string[] }).uids)).catch(() => {});
  }, [isAdmin]);

  // Each person's most recently joined game
  const latest = useMemo(() => {
    const map = new Map<string, Membership>();
    for (const m of memberships) if ((map.get(m.uid)?.joinedAt ?? -1) < m.joinedAt) map.set(m.uid, m);
    return map;
  }, [memberships]);

  if (!isAdmin) return <Page title={cc.usersPage.users}><Empty title={cc.usersPage.onlyAdmins} /></Page>;

  const gameName = (id: string) => games.find(g => g.id === id)?.name ?? id;
  const needle = search.trim().toLowerCase();
  const nameOf = (u: UserProfile) => u.name || u.email;

  async function change(kind: Change, user: UserProfile) {
    if (kind === 'delete') return admin('deleteUser', { uid: user.id });
    await admin('setAdmin', { uid: user.id, admin: kind === 'admin' });
    setAdmins(list => (kind === 'admin' ? [...list, user.id] : list.filter(id => id !== user.id)));
  }

  return (
    <Page title={cc.usersPage.users}>
      <Show live={users} isEmpty={list => list.length === 0} empty={<Empty title={cc.usersPage.noUsersYet} />}>
        {list => {
          const shown = [...list]
            .filter(u => !needle || `${u.name} ${u.email}`.toLowerCase().includes(needle))
            .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
          return (
            <div className="space-y-4">
              <TextInput value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder={cc.usersPage.search} aria-label={cc.usersPage.search} />
              {shown.length === 0 ? <Empty title={cc.usersPage.noMatch} /> : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                  {shown.map(user => {
                    const membership = latest.get(user.id);
                    const team = membership?.teamId ? teams.find(t => t.gameId === membership.gameId && t.id === membership.teamId) : null;
                    const hosting = games.filter(g => (g.hostIds ?? []).includes(user.id));
                    const isMe = user.id === me?.uid;
                    const userIsAdmin = admins.includes(user.id);
                    return (
                      <li key={user.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                            {user.name}
                            {userIsAdmin && <span className="rounded bg-gray-900 px-1.5 py-0.5 text-xs text-white">{cc.usersPage.admin}</span>}
                            {isMe && <span className="text-xs font-normal text-gray-400">{cc.usersPage.you}</span>}
                          </p>
                          <p className="truncate text-xs text-gray-400">{user.email}</p>
                          {hosting.length > 0 && (
                            <p className="text-xs text-gray-600">
                              {cc.usersPage.hosts}{' '}
                              {hosting.map((g, i) => <span key={g.id}>{i > 0 && ', '}<Link to={to.overview(g.id)} className="hover:underline">{g.name}</Link></span>)}
                            </p>
                          )}
                          {membership && (
                            <p className="text-xs text-gray-600">
                              {cc.usersPage.plays}{' '}
                              <Link to={to.overview(membership.gameId)} className="hover:underline">{gameName(membership.gameId)}</Link>
                              {team && <> · <Link to={to.team(team.gameId, team.id)} className="hover:underline">{team.name}</Link></>}
                            </p>
                          )}
                        </div>
                        {/* Your own account is changed from the app, where it asks for your password */}
                        {!isMe && (
                          <div className="flex gap-3">
                            <Button size="small" tone="quiet" onClick={() => setAsking({ kind: userIsAdmin ? 'unadmin' : 'admin', user })}>
                              {userIsAdmin ? cc.usersPage.removeAdmin : cc.usersPage.makeAdmin}
                            </Button>
                            <Button size="small" tone="quiet" className="hover:text-red-600" onClick={() => setAsking({ kind: 'delete', user })}>
                              {cc.usersPage.delete}
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        }}
      </Show>

      {asking && (
        <ConfirmDialog
          title={{
            delete: cc.usersPage.deleteTitle,
            admin: cc.usersPage.makeAdminTitle,
            unadmin: cc.usersPage.removeAdminTitle,
          }[asking.kind]({ name: nameOf(asking.user) })}
          confirmLabel={{ delete: cc.usersPage.deleteForGood, admin: cc.usersPage.makeAdmin, unadmin: cc.usersPage.removeAdmin }[asking.kind]}
          tone={asking.kind === 'admin' ? 'primary' : 'danger'}
          // Deleting an account and granting admin aren't taken lightly; taking admin away can be redone
          typeToConfirm={asking.kind === 'unadmin' ? undefined : nameOf(asking.user)}
          onConfirm={() => change(asking.kind, asking.user)}
          onClose={() => setAsking(null)}
        >
          {{ delete: cc.usersPage.deleteBody, admin: cc.usersPage.makeAdminBody, unadmin: cc.usersPage.removeAdminBody }[asking.kind]}
        </ConfirmDialog>
      )}
    </Page>
  );
}
