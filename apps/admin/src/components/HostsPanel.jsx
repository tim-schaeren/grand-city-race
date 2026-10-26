import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { host } from '../utils/api';
import { ConfirmDialog } from '../ui/ConfirmDialog';

// Who may run this game. Any host can add a co-host by email or remove one;
// the server looks the email up, since hosts can't read anyone's account. A
// game always keeps at least one host. Platform admins can run every game.
export default function HostsPanel({ gameId, game, isAdmin, currentUserId }) {
  const [hosts, setHosts] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);

  const hostIds = game?.hostIds ?? [];
  const canManage = isAdmin || hostIds.includes(currentUserId);

  // Names come from the server; refreshed whenever the list of hosts changes
  useEffect(() => {
    if (!canManage) return;
    host('hosts', { gameId, do: 'list' })
      .then(res => setHosts(res.hosts))
      .catch(() => setHosts(hostIds.map(uid => ({ uid, name: uid === currentUserId ? cc.hostsPanel.you : cc.hostsPanel.aHost }))));
  }, [gameId, canManage, hostIds.join(',')]);

  async function run(body) {
    setBusy(true);
    setError(null);
    try {
      const res = await host('hosts', { gameId, ...body });
      setHosts(res.hosts);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addHost() {
    if (!email.trim() || busy) return;
    if (await run({ do: 'add', email })) setEmail('');
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">{cc.hostsPanel.hosts}</h2>
      <p className="text-xs text-gray-400 mb-3">
        {cc.hostsPanel.hostsRunThisGameQuests}
      </p>

      {hostIds.length === 0 ? (
        <p className="text-xs text-yellow-600 mb-3">
          {cc.hostsPanel.noHostsYetOnlyPlatform}
        </p>
      ) : (
        <div className="space-y-1 mb-3">
          {hosts.map(({ uid, name }) => (
            <div key={uid} className="flex items-center justify-between text-sm text-gray-700">
              <span>{name}{uid === currentUserId ? cc.hostsPanel.you2 : ''}</span>
              {canManage && hosts.length > 1 && (
                <button
                  onClick={() => setRemoving({ uid, name })}
                  disabled={busy}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                >
                  {cc.hostsPanel.remove}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {removing && (
        <ConfirmDialog
          title={cc.hostsPanel.removeTitle({ name: removing.name })}
          confirmLabel={cc.hostsPanel.remove}
          onConfirm={async () => {
            const res = await host('hosts', { gameId, do: 'remove', uid: removing.uid });
            setHosts(res.hosts);
          }}
          onClose={() => setRemoving(null)}
        >
          {cc.hostsPanel.removeBody}
        </ConfirmDialog>
      )}

      {canManage && (
        <>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && addHost()}
              placeholder={cc.hostsPanel.cohostExampleCom}
            />
            <button
              onClick={addHost}
              disabled={!email.trim() || busy}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {cc.hostsPanel.addHost}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          {isAdmin && !hostIds.includes(currentUserId) && (
            <button
              onClick={() => run({ do: 'add', email: auth.currentUser?.email ?? '' })}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors mt-2"
            >
              {cc.hostsPanel.addMeAsHost}
            </button>
          )}
        </>
      )}
    </div>
  );
}
