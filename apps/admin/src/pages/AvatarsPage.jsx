import { consoleCopy as cc } from '@grandcityrace/shared';
// Avatar (temporary) — built for the race of 24 October 2026 and meant to be
// removed afterwards, along with everything else marked "Avatar (temporary)".
import { useState, useEffect } from 'react';
import {
  collection, doc, onSnapshot, query, where, setDoc, deleteField,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';

// One cell: the picture a team sees from this quest on
function PictureCell({ value, onSave }) {
  const [url, setUrl] = useState(value ?? '');
  const [failed, setFailed] = useState(false);
  useEffect(() => { setUrl(value ?? ''); setFailed(false); }, [value]);

  return (
    <div className="w-40 space-y-1.5">
      <div className="h-24 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
        {url.trim() && !failed ? (
          <img src={url.trim()} alt="" className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} />
        ) : (
          <span className="text-[11px] text-gray-300">{failed ? cc.avatarsPage.canTLoad : cc.avatarsPage.previousPicture}</span>
        )}
      </div>
      <input
        value={url}
        onChange={e => { setUrl(e.target.value); setFailed(false); }}
        onBlur={() => { if (url.trim() !== (value ?? '')) onSave(url.trim()); }}
        placeholder={cc.avatarsPage.pictureUrl}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
    </div>
  );
}

export default function AvatarsPage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [quests, setQuests] = useState({});
  const [teams, setTeams] = useState([]);
  const [avatars, setAvatars] = useState({});

  useEffect(() => onSnapshot(doc(db, 'games', gameId), snap => setGame(snap.data() ?? null)), [gameId]);
  useEffect(() => onSnapshot(collection(db, 'games', gameId, 'quests'), snap => {
    const map = {};
    snap.docs.forEach(d => { map[d.id] = d.data(); });
    setQuests(map);
  }), [gameId]);
  useEffect(() => onSnapshot(
    query(collection(db, 'teams'), where('gameId', '==', gameId)),
    snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))),
  ), [gameId]);
  useEffect(() => onSnapshot(collection(db, 'games', gameId, 'avatars'), snap => {
    const map = {};
    snap.docs.forEach(d => { map[d.id] = d.data(); });
    setAvatars(map);
  }), [gameId]);

  function save(teamId, questId, url) {
    setDoc(
      doc(db, 'games', gameId, 'avatars', teamId),
      { [questId]: url || deleteField() },
      { merge: true },
    );
  }

  const questOrder = game?.questOrder ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{cc.avatarsPage.avatars}</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        {cc.avatarsPage.eachTeamSAvatarPicture}
      </p>

      {teams.length === 0 || questOrder.length === 0 ? (
        <p className="text-gray-400">{cc.avatarsPage.addTeamsAndQuestsFirst}</p>
      ) : (
        <div className="overflow-x-auto pb-4">
          <table className="border-separate border-spacing-3">
            <thead>
              <tr>
                <th />
                {questOrder.map((qid, i) => (
                  <th key={qid} className="text-left align-bottom">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">{cc.avatarsPage.quest({ i: i + 1 })}</span>
                    <span className="block w-40 truncate text-sm font-medium text-gray-900">{quests[qid]?.title || cc.avatarsPage.untitled}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map(team => (
                <tr key={team.id}>
                  <th className="text-left align-top pr-2">
                    <span className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: team.color ?? '#111' }} />
                      {team.name}
                    </span>
                  </th>
                  {questOrder.map(qid => (
                    <td key={qid} className="align-top">
                      <PictureCell
                        value={avatars[team.id]?.[qid]}
                        onSave={url => save(team.id, qid, url)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
