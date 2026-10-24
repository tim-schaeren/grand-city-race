import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { recapRef, buildAndSaveRecap, showRecap, hideRecap } from '../utils/recap';

function formatDateTime(ts) {
  return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

// The race recap: hosts build it after the race, look at it, and decide when
// players get to see it
export default function RecapPanel({ gameId, game }) {
  const [recap, setRecap] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => onSnapshot(recapRef(gameId), snap => setRecap(snap.exists() ? snap.data() : null), () => setRecap(null)), [gameId]);

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(cc.recapPanel.failed);
    } finally {
      setBusy(false);
    }
  }

  const button = 'px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">{cc.recapPanel.recap}</h2>
      <p className="text-xs text-gray-400 mb-3">{cc.recapPanel.description}</p>

      {!game.endedAt ? (
        <p className="text-xs text-gray-500">{cc.recapPanel.afterTheRace}</p>
      ) : (
        <>
          {recap && (
            <p className="text-xs text-gray-500 mb-3">
              {cc.recapPanel.builtAt({ when: formatDateTime(recap.builtAt) })}{' '}
              {recap.publishedAt
                ? cc.recapPanel.shownSince({ when: formatDateTime(recap.publishedAt) })
                : cc.recapPanel.hostsOnly}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => run(() => buildAndSaveRecap(gameId))} disabled={busy} className={button}>
              {busy ? cc.recapPanel.building : recap ? cc.recapPanel.rebuild : cc.recapPanel.build}
            </button>
            {recap && (
              <>
                <Link to={`/recap/${gameId}`} target="_blank" className={button}>{cc.recapPanel.open}</Link>
                {recap.publishedAt ? (
                  <button onClick={() => run(() => hideRecap(gameId))} disabled={busy} className={button}>
                    {cc.recapPanel.hide}
                  </button>
                ) : (
                  <button
                    onClick={() => run(() => showRecap(gameId))}
                    disabled={busy}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    {cc.recapPanel.show}
                  </button>
                )}
              </>
            )}
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </>
      )}
    </div>
  );
}
