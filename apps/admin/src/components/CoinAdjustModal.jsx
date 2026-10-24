import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState } from 'react';

// Adjusting a balance always records why, so a mid-race change can be explained afterwards
export default function CoinAdjustModal({ teamName, balance, onSave, onClose }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const delta = parseInt(amount);
  const valid = Number.isFinite(delta) && delta !== 0 && reason.trim().length > 0;
  const balanceAfter = Number.isFinite(delta) ? balance + delta : balance;

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(delta, reason.trim(), Math.max(0, balanceAfter));
    } catch {
      setError(cc.coinAdjustModal.couldNotSaveThatAdjustment);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{cc.coinAdjustModal.adjustCoins}</h2>
          <p className="text-xs text-gray-400 mt-1">{cc.coinAdjustModal.currentlyCoins({ teamName: teamName, balance: balance })}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{cc.coinAdjustModal.amount}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                autoFocus
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 20"
              />
              <span className="text-sm text-gray-400">
                {Number.isFinite(delta) && delta !== 0 ? cc.coinAdjustModal.coins({ mathMax: Math.max(0, balanceAfter) }) : cc.coinAdjustModal.useAMinusSignTo}
              </span>
            </div>
            {balanceAfter < 0 && (
              <p className="text-xs text-yellow-600 mt-1">{cc.coinAdjustModal.thatWouldGoBelowZero}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{cc.coinAdjustModal.reason}</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={cc.coinAdjustModal.wonTheSideChallenge}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
          >
            {cc.coinAdjustModal.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? cc.coinAdjustModal.saving : cc.coinAdjustModal.save}
          </button>
        </div>
      </div>
    </div>
  );
}
