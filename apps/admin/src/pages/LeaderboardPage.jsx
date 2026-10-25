import { rich } from '../utils/rich';
import { consoleCopy as cc, formatDuration, metersBetween } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { gameEconomy, teamCoins, raceTimeMs } from '@grandcityrace/shared';
import { db } from '../firebase';
import Icon from '../components/Icon';
import { useGamePlayers } from '../hooks/useGamePlayers';

function teamQuestStatus(team, questMap, memberUsers, questOrder) {
  if (team.finishedAt) return null;
  const questId = team.currentQuestId ?? questOrder?.[0] ?? null;
  if (!questId) return null;
  const quest = questMap[questId];
  if (!quest) return null;

  const withLoc = memberUsers.filter(u => u.lastLocation);
  if (!withLoc.length || !quest.location?.lat) {
    return { label: quest.title, solving: false };
  }

  const lat = withLoc.reduce((s, u) => s + u.lastLocation.lat, 0) / withLoc.length;
  const lng = withLoc.reduce((s, u) => s + u.lastLocation.lng, 0) / withLoc.length;
  const solving = metersBetween({ lat, lng }, quest.location) <= (quest.fenceRadius ?? 50);
  return { label: quest.title, solving };
}

export default function LeaderboardPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [questMap, setQuestMap] = useState({});
  const users = useGamePlayers(gameId);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'teams'), where('gameId', '==', gameId)),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
  }, [gameId]);

  // Pauses and resumes, so a pause after a team finished doesn't shorten its time
  const [pauses, setPauses] = useState([]);
  useEffect(() => onSnapshot(
    query(collection(db, 'games', gameId, 'activity'), where('type', 'in', ['game_paused', 'game_resumed'])),
    snap => setPauses(snap.docs.map(d => d.data())),
    () => setPauses([]),
  ), [gameId]);

  useEffect(() => {
    return onSnapshot(collection(db, 'games', gameId, 'attempts'), snap =>
      setAttempts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(collection(db, 'games', gameId, 'quests'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
      setQuestMap(map);
    });
  }, [gameId]);

  const totalQuests = game?.questOrder?.length ?? 0;
  const economy = gameEconomy(game);

  // A team is "stuck" when it keeps getting turned away on the quest it's on now
  const STUCK_THRESHOLD = 3;
  function wrongTriesOnCurrentQuest(team) {
    const questId = team.currentQuestId ?? game?.questOrder?.[0] ?? null;
    if (!questId || team.finishedAt) return 0;
    return attempts.filter(a => a.teamId === team.id && a.questId === questId).length;
  }

  const sorted = [...teams].sort((a, b) => {
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    if (a.finishedAt) return -1;
    if (b.finishedAt) return 1;
    return (b.completedQuestIds?.length ?? 0) - (a.completedQuestIds?.length ?? 0);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{cc.leaderboardPage.leaderboard}</h1>

      {sorted.length === 0 ? (
        <p className="text-gray-400">{cc.leaderboardPage.noTeamsYet}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((team, i) => {
            const completed = team.completedQuestIds?.length ?? 0;
            const pct = totalQuests > 0 ? (completed / totalQuests) * 100 : 0;
            const memberUsers = users.filter(u => team.memberIds?.includes(u.id));
            const status = teamQuestStatus(team, questMap, memberUsers, game?.questOrder);
            const hintsUsed = Object.values(team.hintsRevealed ?? {}).reduce((sum, n) => sum + n, 0);
            const wrongTries = wrongTriesOnCurrentQuest(team);

            return (
              <div
                key={team.id}
                className="bg-white border border-gray-200 rounded-lg px-5 py-4 cursor-pointer hover:border-gray-300 transition-colors"
                onClick={() => navigate(`/games/${gameId}/teams`, { state: { highlightTeamId: team.id } })}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 flex justify-center shrink-0">
                    {i < 3 ? (
                      <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                    ) : (
                      <span className="text-sm font-semibold text-gray-400">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{team.name}</p>
                      <p className="text-xs text-gray-500 shrink-0">
                        {rich(cc.leaderboardPage.quests({ span: <span className="inline-flex items-center gap-1 text-gray-400 mr-2 align-middle" title={cc.leaderboardPage.coinsHintsRevealed}>
                          <Icon name="circle-multiple-outline" size={13} /> {teamCoins(team, economy)}
                          {hintsUsed > 0 && (
                            <>
                              <span className="mx-0.5">·</span>
                              <Icon name="lightbulb-outline" size={13} /> {hintsUsed}
                            </>
                          )}
                        </span>, completed: completed, totalQuests: totalQuests, teamFinishedAt: team.finishedAt && game && (
                          <span className="ml-2 inline-flex items-center gap-1 text-green-600 font-medium align-middle">
                            <Icon name="check" size={13} /> {formatDuration(raceTimeMs(team, game, pauses))}
                          </span>
                        ) }))}
                      </p>
                    </div>
                    {wrongTries >= STUCK_THRESHOLD && (
                      <p className="text-xs text-yellow-600 mb-1">
                        {cc.leaderboardPage.stuckWrongAnswersOnThis({ wrongTries: wrongTries })}
                      </p>
                    )}
                    {status && (
                      <p className="text-xs text-gray-400 mb-2 truncate">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${status.solving ? 'bg-green-500' : 'bg-yellow-400'}`}
                        />
                        {status.solving ? cc.leaderboardPage.solving : cc.leaderboardPage.lookingFor}{' '}
                        <span className="text-gray-500">{status.label}</span>
                      </p>
                    )}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
