import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import { collection, collectionGroup, onSnapshot } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { paths } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { admin } from '../utils/api';

// Everyone with an account, for platform admins: the game and team they are
// in, the games they host, admin rights, and deleting an account for someone
// who can't do it from the app. Admin is a claim on the sign-in, so it is
// granted here, through the server.
export default function UsersPage() {
  const { isAdmin, user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  // The list spans every game, so it stays with platform admins
  useEffect(() => {
    if (!isAdmin) return;
    const unsubs = [
      onSnapshot(collection(db, 'users'), snap =>
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collectionGroup(db, 'players'), snap =>
        setMemberships(snap.docs.map(d => ({ ...d.data(), gameId: d.ref.parent.parent.id })))),
      onSnapshot(collectionGroup(db, 'teams'), snap =>
        setTeams(snap.docs.filter(d => d.ref.parent.parent).map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, paths.games()), snap =>
        setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    admin('listAdmins', {}).then(r => setAdmins(r.uids)).catch(() => {});
    return () => unsubs.forEach(u => u());
  }, [isAdmin]);

  const navigate = useNavigate();
  const location = useLocation();
  const highlightUserId = location.state?.highlightUserId ?? null;

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const gameMap = Object.fromEntries(games.map(g => [g.id, g]));
  // Each person's most recently joined game
  const latest = {};
  for (const m of memberships) {
    if (!latest[m.uid] || m.joinedAt > latest[m.uid].joinedAt) latest[m.uid] = m;
  }

  async function setAdmin(user, on) {
    setError(null);
    try {
      await admin('setAdmin', { uid: user.id, admin: on });
      setAdmins(list => (on ? [...list, user.id] : list.filter(id => id !== user.id)));
    } catch (e) {
      setError({ id: user.id, message: e.message });
    }
  }

  useEffect(() => {
    if (!highlightUserId || !users.length) return;
    setTimeout(() => {
      document.getElementById(`user-row-${highlightUserId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [highlightUserId, users]);

  // Only the server may delete someone else's sign-in; the row disappears
  // once their profile is gone
  async function deleteUser(user) {
    setDeletingId(user.id);
    setError(null);
    try {
      await admin('deleteUser', { uid: user.id });
      setConfirmId(null);
    } catch (e) {
      setError({ id: user.id, message: e.message });
    } finally {
      setDeletingId(null);
    }
  }

  const sorted = [...users].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{cc.usersPage.users}</h1>
        <p className="text-gray-400">{cc.usersPage.onlyAdmins}</p>
      </div>
    );
  }

  const teamLink = team => (
    <button
      onClick={() => navigate(`/games/${team.gameId}/teams`, { state: { highlightTeamId: team.id } })}
      className="text-gray-600 hover:text-gray-900 hover:underline"
    >
      {team.name}
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{cc.usersPage.users}</h1>

      {sorted.length === 0 ? (
        <p className="text-gray-400">{cc.usersPage.noUsersYet}</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {sorted.map(user => {
            const membership = latest[user.id];
            const team = membership?.teamId ? teamMap[membership.teamId] : null;
            const game = membership ? gameMap[membership.gameId] : null;
            const userIsAdmin = admins.includes(user.id);
            const isMe = user.id === me?.uid;
            const hosting = games.filter(g => (g.hostIds ?? []).includes(user.id));
            return (
              <div
                key={user.id}
                id={`user-row-${user.id}`}
                className={`px-4 py-3 transition-colors ${highlightUserId === user.id ? 'bg-indigo-50' : ''}`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      {userIsAdmin && (
                        <span className="text-xs bg-gray-900 text-white px-1.5 py-0.5 rounded font-medium">
                          {cc.usersPage.admin}
                        </span>
                      )}
                      {isMe && <span className="text-xs text-gray-400">{cc.usersPage.you}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                    {hosting.length > 0 && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {cc.usersPage.hostOf({ games: hosting.map(g => g.name).join(', ') })}
                      </p>
                    )}
                    <p className="text-xs mt-0.5 sm:hidden">
                      {team ? teamLink(team) : <span className="text-gray-300">{cc.usersPage.unassigned}</span>}
                      {game && <span className="text-gray-400"> · {game.name}</span>}
                    </p>
                  </div>

                  <div className="text-xs text-right shrink-0 hidden sm:block">
                    {team ? (
                      <span>
                        {teamLink(team)}
                        {game && <span className="text-gray-400"> · {game.name}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-300">{cc.usersPage.unassigned}</span>
                    )}
                  </div>

                  {!isMe && (
                    <button
                      onClick={() => setAdmin(user, !userIsAdmin)}
                      className="text-xs text-gray-400 hover:text-gray-900 transition-colors shrink-0"
                    >
                      {userIsAdmin ? cc.usersPage.removeAdmin : cc.usersPage.makeAdmin}
                    </button>
                  )}

                  {/* Your own account is deleted from the app, where it asks for your password */}
                  {!isMe && (
                    <button
                      onClick={() => { setConfirmId(user.id); setError(null); }}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      {cc.usersPage.delete}
                    </button>
                  )}
                </div>

                {confirmId === user.id && (
                  <div className="mt-3 border border-red-200 rounded-lg p-3 space-y-2">
                    <p className="text-sm text-gray-700">{cc.usersPage.deleteConfirm({ name: user.name ?? user.email })}</p>
                    {error?.id === user.id && <p className="text-xs text-red-500">{error.message}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteUser(user)}
                        disabled={deletingId === user.id}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === user.id ? cc.usersPage.deleting : cc.usersPage.deleteForGood}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={deletingId === user.id}
                        className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                      >
                        {cc.usersPage.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
