import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import {
  doc, collection, query, where,
  updateDoc, getDocs, onSnapshot, writeBatch, deleteField,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { gameEconomy, copy, formatDuration } from '@grandcityrace/shared';
import { db } from '../firebase';
import { sendPushToPlayers } from '../utils/push';
import {
  logActivity, clearActivity, clearAttempts, clearTrail, clearMessages, clearCoinLedger,
} from '../utils/activity';
import { useAuth } from '../hooks/useAuth';
import { formatInZone, gameTimeZone } from '../utils/zonedTime';
import HostsPanel from '../components/HostsPanel';
import JoinCodePanel from '../components/JoinCodePanel';
import RecapPanel from '../components/RecapPanel';
import { clearRecap } from '../utils/recap';

function getStatus(game) {
  if (!game) return null;
  if (game.endedAt) return 'ended';
  if (game.pausedAt) return 'paused';
  if (Date.now() >= game.startDateTime) return 'running';
  return 'upcoming';
}

// Times by the game's own clock (see zonedTime.js)
function formatDateTime(ts, game) {
  return formatInZone(ts, gameTimeZone(game));
}

const STATUS_STYLES = {
  upcoming: 'bg-gray-100 text-gray-600',
  running:  'bg-green-100 text-green-700',
  paused:   'bg-yellow-100 text-yellow-700',
  ended:    'bg-red-100 text-red-600',
};
const STATUS_LABELS = {
  upcoming: cc.gamePage.upcoming, running: cc.gamePage.running, paused: cc.gamePage.paused, ended: cc.gamePage.ended,
};

export default function GamePage() {
  const { user, isAdmin } = useAuth();
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);

  // "end game" confirmation — requires typing END
  const [endInput, setEndInput] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // "reset" confirmation — requires typing RESET
  const [resetInput, setResetInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [gameId]);

  async function run(fn) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function startNow() {
    await run(async () => {
      await updateDoc(doc(db, 'games', gameId), { startDateTime: Date.now() });
      await logActivity(gameId, { type: 'game_started' });
      await sendPushToPlayers(gameId, ...copy.hostPush.started);
    });
  }

  async function pause() {
    await run(async () => {
      await updateDoc(doc(db, 'games', gameId), { pausedAt: Date.now() });
      await logActivity(gameId, { type: 'game_paused' });
      await sendPushToPlayers(gameId, ...copy.hostPush.paused);
    });
  }

  async function resume() {
    const extra = Date.now() - game.pausedAt;
    await run(async () => {
      await updateDoc(doc(db, 'games', gameId), {
        pausedAt: null,
        totalPausedMs: (game.totalPausedMs ?? 0) + extra,
      });
      await logActivity(gameId, { type: 'game_resumed' });
      await sendPushToPlayers(gameId, ...copy.hostPush.resumed);
    });
  }

  async function endGame() {
    await run(async () => {
      await updateDoc(doc(db, 'games', gameId), { endedAt: Date.now() });
      await logActivity(gameId, { type: 'game_ended' });
      await sendPushToPlayers(gameId, ...copy.hostPush.ended);
    });
    setShowEndConfirm(false);
    setEndInput('');
  }

  async function resetGame() {
    await run(async () => {
      const batch = writeBatch(db);
      // Reset game state
      batch.update(doc(db, 'games', gameId), {
        endedAt: null, pausedAt: null, totalPausedMs: 0,
      });
      // Reset all team progress
      const teamsSnap = await getDocs(query(collection(db, 'teams'), where('gameId', '==', gameId)));
      teamsSnap.docs.forEach(d => {
        batch.update(d.ref, {
          completedQuestIds: [], currentQuestId: null, finishedAt: null, pausedMsAtFinish: deleteField(), questProgress: null,
          coins: gameEconomy(game).startingCoins, hintsRevealed: {},
          // Items bought or suffered before the reset would otherwise carry over:
          // a compass or radar still running, unused shields, a curse, the
          // cooldown after being robbed
          activeCompassUntil: deleteField(), activeRadarUntil: deleteField(),
          shields: deleteField(), cursedUntil: deleteField(), cursedByName: deleteField(),
          robbedAt: deleteField(),
          teamChatReadAt: deleteField(), hostChatReadAt: deleteField(),
        });
      });
      // Last known positions, so the live map doesn't show where people were.
      // Push tokens stay: the players are still in the game.
      const privateSnap = await getDocs(collection(db, 'games', gameId, 'private'));
      privateSnap.docs.forEach(d => {
        if (d.data().lastLocation) batch.update(d.ref, { lastLocation: deleteField() });
      });
      const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'));
      await batch.commit();
      // An admin's map also reads profiles, which hold a copy of the position.
      // One at a time: a team can still list an account that has since been
      // deleted, and that one failing must not undo the reset.
      if (isAdmin) {
        const memberIds = new Set([
          ...playersSnap.docs.map(d => d.id),
          ...teamsSnap.docs.flatMap(d => d.data().memberIds ?? []),
        ]);
        await Promise.all([...memberIds].map(uid =>
          updateDoc(doc(db, 'users', uid), { lastLocation: null }).catch(() => {})));
      }
      // Everything the race left behind goes; the game is back at the start
      await clearActivity(gameId);
      await clearAttempts(gameId);
      await clearTrail(gameId);
      await clearMessages(gameId);
      await clearRecap(gameId);
      for (const team of teamsSnap.docs) await clearCoinLedger(team.id);
      // The feed starts empty: the race starts at its start time, or when a
      // host presses Start now, which is what says so in the feed
    });
    setShowResetConfirm(false);
    setResetInput('');
  }

  if (!game) return null;

  const status = getStatus(game);
  const totalPaused = game.totalPausedMs ?? 0;

  return (
    <div className="max-w-sm">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{cc.gamePage.game}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-2">
        <p className="text-sm font-semibold text-gray-900">{game.name}</p>
        <p className="text-xs text-gray-500">{cc.gamePage.scheduledStart({ formatDateTime: cc.gamePage.inZone({ time: formatDateTime(game.startDateTime, game), zone: gameTimeZone(game).replace(/_/g, ' ') }) })}</p>
        {totalPaused > 0 && (
          <p className="text-xs text-gray-500">{cc.gamePage.totalPaused({ formatDuration: formatDuration(totalPaused) })}</p>
        )}
        {game.pausedAt && (
          <p className="text-xs text-yellow-600">{cc.gamePage.pausedAt({ formatDateTime: formatDateTime(game.pausedAt, game) })}</p>
        )}
        {game.endedAt && (
          <p className="text-xs text-red-500">{cc.gamePage.endedAt({ formatDateTime: formatDateTime(game.endedAt, game) })}</p>
        )}
      </div>

      <JoinCodePanel gameId={gameId} game={game} />

      <HostsPanel gameId={gameId} game={game} isAdmin={isAdmin} currentUserId={user?.uid} />

      <RecapPanel gameId={gameId} game={game} />

      {/* Controls */}
      <div className="space-y-3">
        {!game.endedAt && (
          <>
            {status === 'upcoming' && (
              <button
                onClick={startNow}
                disabled={busy}
                className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {cc.gamePage.startNow}
              </button>
            )}

            {status === 'running' && (
              <button
                onClick={pause}
                disabled={busy}
                className="w-full py-3 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 disabled:opacity-50 transition-colors"
              >
                {cc.gamePage.pauseGame}
              </button>
            )}

            {status === 'paused' && (
              <button
                onClick={resume}
                disabled={busy}
                className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {cc.gamePage.resumeGame}
              </button>
            )}

            {(status === 'running' || status === 'paused') && (
              showEndConfirm ? (
                <div className="border border-red-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    {rich(cc.gamePage.thisWillEndTheGame({ span: <span className="font-mono font-bold">{cc.gamePage.end}</span> }))}
                  </p>
                  <input
                    value={endInput}
                    onChange={e => setEndInput(e.target.value)}
                    placeholder={cc.gamePage.typeEnd({ word: cc.gamePage.end })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={endGame}
                      disabled={busy || endInput !== cc.gamePage.end}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
                    >
                      {cc.gamePage.endGame}
                    </button>
                    <button
                      onClick={() => { setShowEndConfirm(false); setEndInput(''); }}
                      className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      {cc.gamePage.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="w-full py-3 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  {cc.gamePage.endGame}
                </button>
              )
            )}
          </>
        )}

        {/* Reset — only after game has ended */}
        {game.endedAt && (
          showResetConfirm ? (
            <div className="border border-gray-300 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-700">
                {rich(cc.gamePage.thisSendsEveryTeamBack({ span: <span className="font-mono font-bold">{cc.gamePage.reset}</span> }))}
              </p>
              <input
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                placeholder={cc.gamePage.typeReset({ word: cc.gamePage.reset })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  disabled={busy || resetInput !== cc.gamePage.reset}
                  className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {cc.gamePage.resetGame}
                </button>
                <button
                  onClick={() => { setShowResetConfirm(false); setResetInput(''); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  {cc.gamePage.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              {cc.gamePage.resetGame}
            </button>
          )
        )}
      </div>
    </div>
  );
}
