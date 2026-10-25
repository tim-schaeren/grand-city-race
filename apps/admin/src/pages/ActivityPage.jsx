import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { formatActivity, formatActivityTime, copy } from '@grandcityrace/shared';
import { db } from '../firebase';
import { logActivity } from '../utils/activity';
import { sendPushToPlayers } from '../utils/push';
import Icon from '../components/Icon';
import { useGame } from '../hooks/useGame';
import { gameTimeZone } from '../utils/zonedTime';

const FEED_LIMIT = 300;

// Days by the game's own clock (see zonedTime.js)
function groupByDay(entries, zone) {
  const groups = [];
  for (const entry of entries) {
    const day = new Date(entry.at).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', timeZone: zone });
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}

export default function ActivityPage() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  const zone = gameTimeZone(game);
  const [entries, setEntries] = useState([]);
  const [teamFilter, setTeamFilter] = useState('all');
  const [note, setNote] = useState('');
  const [alsoPush, setAlsoPush] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    // Admins may read every entry, so one unfiltered subscription is enough
    return onSnapshot(
      query(collection(db, 'games', gameId, 'activity'), orderBy('at', 'desc'), limit(FEED_LIMIT)),
      snap => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
  }, [gameId]);

  const teams = [...new Map(
    entries.filter(e => e.teamId).map(e => [e.teamId, e.teamName ?? e.teamId]),
  )];
  const visible = teamFilter === 'all' ? entries : entries.filter(e => e.teamId === teamFilter);

  async function postNote() {
    const text = note.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await logActivity(gameId, { type: 'admin_note', text });
      if (alsoPush) await sendPushToPlayers(gameId, copy.hostPush.announcement, text);
      setNote('');
      setAlsoPush(false);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{cc.activityPage.activity}</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">{cc.activityPage.postANote}</label>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && postNote()}
            placeholder={cc.activityPage.bonusChallengeAtTheFountain}
          />
          <button
            onClick={postNote}
            disabled={!note.trim() || posting}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {posting ? cc.activityPage.posting : cc.activityPage.post}
          </button>
        </div>
        <label className="flex items-center gap-2 mt-2 text-xs text-gray-500 cursor-pointer">
          {rich(cc.activityPage.alsoSendAsAPush({ input: <input type="checkbox" checked={alsoPush} onChange={e => setAlsoPush(e.target.checked)} className="accent-gray-900" /> }))}
        </label>
      </div>

      {teams.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[[cc.activityPage.all, cc.activityPage.allTeams], ...teams].map(([id, name]) => (
            <button
              key={id}
              onClick={() => setTeamFilter(id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                teamFilter === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-gray-400">{cc.activityPage.nothingHasHappenedYet}</p>
      ) : (
        groupByDay(visible, zone).map(group => (
          <div key={group.day} className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{group.day}</p>
            <div className="space-y-1">
              {group.entries.map(entry => {
                const { icon, text } = formatActivity(entry);
                return (
                  <div key={entry.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                    <Icon name={icon} size={18} className="text-gray-500" />
                    <span className="flex-1 text-sm text-gray-900">{text}</span>
                    {entry.visibility === 'team' && (
                      <span className="text-xs text-gray-300 shrink-0" title={cc.activityPage.onlyThisTeamCanSee}>{cc.activityPage.private}</span>
                    )}
                    <span className="text-xs text-gray-400 shrink-0 tabular-nums">{formatActivityTime(entry.at, zone)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
