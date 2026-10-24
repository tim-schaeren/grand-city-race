import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { generateJoinCode } from '@grandcityrace/shared';
import { db } from '../firebase';

// Players type this code in the app to join. Games created before invite codes
// existed simply don't have one until a host generates it here.
export default function JoinCodePanel({ gameId, game }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const code = game?.joinCode ?? null;

  async function setCode() {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'games', gameId), { joinCode: generateJoinCode() });
      setConfirmingNew(false);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">{cc.joinCodePanel.inviteCode}</h2>
      <p className="text-xs text-gray-400 mb-3">
        {cc.joinCodePanel.playersEnterThisInThe}
      </p>

      {code ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-[0.3em] text-gray-900 tabular-nums">
              {code}
            </span>
            <button
              onClick={copy}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
            >
              {copied ? cc.joinCodePanel.copied : cc.joinCodePanel.copy}
            </button>
          </div>
          {confirmingNew ? (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-700 mb-2">
                {cc.joinCodePanel.aNewCodeStopsThe}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={setCode}
                  disabled={busy}
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {busy ? cc.joinCodePanel.working : cc.joinCodePanel.yesNewCode}
                </button>
                <button
                  onClick={() => setConfirmingNew(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {cc.joinCodePanel.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingNew(true)}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors mt-2"
            >
              {cc.joinCodePanel.generateANewCode}
            </button>
          )}
        </>
      ) : (
        <button
          onClick={setCode}
          disabled={busy}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {busy ? cc.joinCodePanel.working : cc.joinCodePanel.generateInviteCode}
        </button>
      )}
    </div>
  );
}
