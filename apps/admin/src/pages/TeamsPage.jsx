import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, arrayUnion, arrayRemove, query, where, deleteField,
} from 'firebase/firestore';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import {
  gameEconomy,
  teamCoins,
  normalizeQuest,
  TEAM_COLORS,
  MAX_TEAMS_PER_GAME,
  pausedMsNow,
} from '@grandcityrace/shared';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../firebase';
import CoinAdjustModal from '../components/CoinAdjustModal';
import TeamProgressModal from '../components/TeamProgressModal';
import { logActivity } from '../utils/activity';
import Icon from '../components/Icon';

function DraggableMemberRow({ user, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: user.id });
  const style = transform
    ? { transform: cc.teamsPage.translate3dPxPx0({ transformX: transform.x, transformY: transform.y }) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between py-0.5 ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
          className="text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing text-xs select-none"
        >
          ⠿
        </button>
        <span className="text-sm text-gray-700">{user.name}</span>
      </div>
      <button
        onClick={onRemove}
        className="text-xs text-gray-300 hover:text-red-500 transition-colors ml-2"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

function DraggablePlayerChip({ user }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: user.id });
  const style = transform
    ? { transform: cc.teamsPage.translate3dPxPx0({ transformX: transform.x, transformY: transform.y }) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing select-none transition-opacity ${isDragging ? 'opacity-40' : 'hover:border-gray-400'}`}
    >
      <span className="text-gray-300 text-xs">⠿</span>
      <span className="text-sm text-gray-700">{user.name}</span>
    </div>
  );
}

function DroppableTeamCard({ team, members, maxTeamSize, coins, onRemove, onEdit, onViewMap, onAdjustCoins, onProgress }) {
  const isFull = maxTeamSize && members.length >= maxTeamSize;
  const { setNodeRef, isOver } = useDroppable({ id: team.id });

  return (
    <div
      id={`team-${team.id}`}
      ref={setNodeRef}
      className={`rounded-lg p-4 border-2 transition-colors ${
        isOver && isFull ? 'border-red-400 bg-white'
        : isOver ? 'border-gray-900 bg-gray-50'
        : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {team.color && (
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
          )}
          <span className="font-medium text-gray-900">{team.name}</span>
          {maxTeamSize && (
            <span className="text-xs font-medium text-gray-400">
              {members.length}/{maxTeamSize}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onAdjustCoins(team)}
            title={cc.teamsPage.adjustCoins}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Icon name="circle-multiple-outline" size={14} /> {coins}
          </button>
          <button
            onClick={() => onProgress(team)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            {cc.teamsPage.progress}
          </button>
          <button
            onClick={() => onViewMap(team)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            {cc.teamsPage.map}
          </button>
          <button
            onClick={() => onEdit(team)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            {cc.teamsPage.edit}
          </button>
        </div>
      </div>

      <div className="space-y-1 min-h-[2rem]">
        {members.length === 0 && !isOver && (
          <p className="text-sm text-gray-300 italic">{cc.teamsPage.dropPlayersHere}</p>
        )}
        {members.map(user => (
          <DraggableMemberRow
            key={user.id}
            user={user}
            onRemove={() => onRemove(user, team)}
          />
        ))}
      </div>

      {isFull && isOver && <p className="text-xs text-red-400 mt-2">{cc.teamsPage.teamIsFull}</p>}
    </div>
  );
}


function TeamForm({ team, onSave, onCancel, onDelete, saving }) {
  const [name, setName] = useState(team?.name ?? '');
  const [color, setColor] = useState(team?.color ?? TEAM_COLORS[0]);
  const [confirming, setConfirming] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const deleteConfirmed = deleteInput === team?.name;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">{team ? cc.teamsPage.editTeam : cc.teamsPage.newTeam}</h2>
      </div>

      <div className="flex-1 px-6 py-5">
        {confirming ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">{cc.teamsPage.deleteThisTeam}</p>
              <p className="text-sm text-red-600">{cc.teamsPage.allMembersWillBeUnassigned}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                {rich(cc.teamsPage.typeToConfirm({ span: <span className="font-semibold">{team.name}</span> }))}
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={team.name}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{cc.teamsPage.name}</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={cc.teamsPage.eGTeamAlpha}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{cc.teamsPage.color}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {TEAM_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
              <input
                type="color"
                className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0.5"
                value={color}
                onChange={e => setColor(e.target.value)}
                title={cc.teamsPage.customColor}
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-6 py-4 flex items-center">
        {confirming ? (
          <>
            <button
              onClick={() => { setConfirming(false); setDeleteInput(''); }}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              {cc.teamsPage.back}
            </button>
            <button
              onClick={onDelete}
              disabled={!deleteConfirmed}
              className="ml-auto px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cc.teamsPage.deleteTeam}
            </button>
          </>
        ) : (
          <>
            {team && (
              <button
                onClick={() => setConfirming(true)}
                className="text-sm text-red-400 hover:text-red-600 transition-colors"
              >
                {cc.teamsPage.delete}
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                {cc.teamsPage.cancel}
              </button>
              <button
                onClick={() => onSave({ name: name.trim(), color })}
                disabled={!name.trim() || saving}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? cc.teamsPage.saving : cc.teamsPage.saveTeam}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { gameId } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [progressTeamId, setProgressTeamId] = useState(null);
  const [quests, setQuests] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      if (snap.exists()) setGame({ id: snap.id, ...snap.data() });
    });
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'teams'), where('gameId', '==', gameId)),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [gameId]);

  // Quests, for the per-team progress controls
  useEffect(() => {
    return onSnapshot(collection(db, 'games', gameId, 'quests'), snap => {
      const map = {};
      snap.forEach(d => { map[d.id] = normalizeQuest(d.id, d.data()); });
      setQuests(map);
    });
  }, [gameId]);

  // Platform admins can read every user; a host can't, and doesn't need to —
  // the game's own membership documents name the players who joined it.
  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [isAdmin]);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'games', gameId, 'players'),
      snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setMembers([]),
    );
  }, [gameId]);

  // Scroll to + briefly highlight a team when arriving from leaderboard/players
  useEffect(() => {
    if (!state?.highlightTeamId || teams.length === 0) return;
    const el = document.getElementById(`team-${state.highlightTeamId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'box-shadow 0.3s';
      el.style.boxShadow = cc.teamsPage.t0003px111;
      setTimeout(() => { el.style.boxShadow = ''; }, 1500);
    }
  }, [state?.highlightTeamId, teams.length]);

  // Everyone this page knows about: players who joined with the invite code,
  // plus — for admins — users already on a team, which covers games whose
  // players were assigned by hand before invite codes existed.
  const assignedIds = new Set(teams.flatMap(t => t.memberIds ?? []));
  const people = [
    ...members.map(m => ({ id: m.id, name: m.name })),
    ...users
      .filter(u => !u.isAdmin && (assignedIds.has(u.id) || u.gameId === gameId))
      .map(u => ({ id: u.id, name: u.name })),
  ];
  const userMap = Object.fromEntries(people.map(p => [p.id, p]));
  const unassigned = Object.values(userMap).filter(p => !assignedIds.has(p.id));
  const activeUser = activeId ? userMap[activeId] : null;

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;

    const user = userMap[active.id];
    const targetTeam = teams.find(t => t.id === over.id);
    if (!user || !targetTeam) return;

    // Membership lives on the team, so read it from there rather than from the
    // player record, which a host can't always see
    const sourceTeam = teams.find(t => (t.memberIds ?? []).includes(user.id)) ?? null;

    if (sourceTeam?.id === targetTeam.id) return;

    const targetMembers = (targetTeam.memberIds ?? []).filter(id => id !== user.id);
    if (game?.maxTeamSize && targetMembers.length >= game.maxTeamSize) return;

    // Optimistic update: reflect the move immediately so there's no snap-back
    // while we wait for the Firestore round-trip. Team membership is what the
    // page renders from, so updating teams is enough.
    setTeams(prev => prev.map(t => {
      if (t.id === targetTeam.id) {
        return { ...t, memberIds: [...new Set([...(t.memberIds ?? []), user.id])] };
      }
      if (sourceTeam && t.id === sourceTeam.id) {
        return { ...t, memberIds: (t.memberIds ?? []).filter(id => id !== user.id) };
      }
      return t;
    }));

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.id), { teamId: targetTeam.id });
    batch.update(doc(db, 'teams', targetTeam.id), { memberIds: arrayUnion(user.id) });
    if (sourceTeam) {
      batch.update(doc(db, 'teams', sourceTeam.id), { memberIds: arrayRemove(user.id) });
    }
    batch.commit();
  }

  async function handleRemove(user, team) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.id), { teamId: null });
    batch.update(doc(db, 'teams', team.id), { memberIds: arrayRemove(user.id) });
    await batch.commit();
  }

  const economy = gameEconomy(game);
  const progressTeam = teams.find(t => t.id === progressTeamId) ?? null;

  // Applies a live fix to one team and tells that team what happened
  async function handleProgressAction(action) {
    const team = progressTeam;
    if (!team) return;
    const questOrder = game?.questOrder ?? [];
    const teamRef = doc(db, 'teams', team.id);
    const entry = { visibility: 'team', teamId: team.id, teamName: team.name };

    if (action.type === 'solve') {
      const nextQuestId = questOrder[questOrder.indexOf(action.questId) + 1] ?? null;
      const update = {
        completedQuestIds: arrayUnion(action.questId),
        currentQuestId: nextQuestId,
        questProgress: null,
        // Paid as if solved, so a broken quest doesn't leave the team poorer
        coins: teamCoins(team, economy) + economy.coinsPerQuest,
      };
      if (!nextQuestId) {
        update.finishedAt = Date.now();
        update.pausedMsAtFinish = pausedMsNow(game, Date.now());
      }
      await updateDoc(teamRef, update);
      await logActivity(gameId, { ...entry, type: 'admin_marked_solved', questTitle: action.questTitle });
    }

    if (action.type === 'move') {
      // The team then stands where it would have got to by itself: everything
      // before that quest solved, nothing from it on, so it plays them again
      const solved = questOrder.slice(0, Math.max(0, questOrder.indexOf(action.questId)));
      await updateDoc(teamRef, {
        currentQuestId: action.questId, completedQuestIds: solved,
        questProgress: null, finishedAt: null, pausedMsAtFinish: deleteField(),
      });
      await logActivity(gameId, { ...entry, type: 'admin_moved', questTitle: action.questTitle });
    }

    if (action.type === 'finish') {
      await updateDoc(teamRef, { finishedAt: Date.now(), pausedMsAtFinish: pausedMsNow(game, Date.now()), questProgress: null });
      await logActivity(gameId, { ...entry, type: 'admin_finished' });
    }

    if (action.type === 'unfinish') {
      await updateDoc(teamRef, { finishedAt: null, pausedMsAtFinish: deleteField() });
      await logActivity(gameId, { ...entry, type: 'admin_unfinished' });
    }
  }

  // Writes the new balance and a ledger entry explaining the change
  async function handleAdjustCoins(delta, reason, balanceAfter) {
    const team = adjusting;
    await updateDoc(doc(db, 'teams', team.id), { coins: balanceAfter });
    await addDoc(collection(db, 'teams', team.id, 'coinLedger'), {
      delta,
      reason,
      balanceAfter,
      byName: auth.currentUser?.email ?? 'admin',
      at: Date.now(),
    });
    // Only the team itself (and admins) sees what it was given or charged
    await logActivity(gameId, {
      type: 'coins_adjusted',
      visibility: 'team',
      teamId: team.id,
      teamName: team.name,
      amount: delta,
      reason,
    });
    setAdjusting(null);
  }

  async function handleSaveTeam(data) {
    setSaving(true);
    try {
      if (selected === 'new') {
        await addDoc(collection(db, 'teams'), {
          ...data,
          gameId,
          memberIds: [],
          score: 0,
          coins: gameEconomy(game).startingCoins,
          currentQuestId: null,
          completedQuestIds: [],
          finishedAt: null,
          questProgress: null,
        });
      } else {
        await updateDoc(doc(db, 'teams', selected.id), data);
      }
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTeam() {
    if (!selected || selected === 'new') return;
    const batch = writeBatch(db);
    for (const uid of selected.memberIds ?? []) {
      batch.update(doc(db, 'users', uid), { teamId: null });
    }
    batch.delete(doc(db, 'teams', selected.id));
    await batch.commit();
    setSelected(null);
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{cc.teamsPage.teams}</h1>
          <button
            onClick={() => setSelected('new')}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {cc.teamsPage.newTeam2}
          </button>
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {teams.length === 0 && unassigned.length === 0 ? (
            <p className="text-gray-400">{cc.teamsPage.noTeamsYetCreateThe}</p>
          ) : (
            <div className="space-y-8">
              {teams.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map(team => {
                    const members = (team.memberIds ?? []).map(id => userMap[id]).filter(Boolean);
                    return (
                      <DroppableTeamCard
                        key={team.id}
                        team={team}
                        members={members}
                        maxTeamSize={game?.maxTeamSize}
                        coins={teamCoins(team, economy)}
                        onRemove={handleRemove}
                        onEdit={setSelected}
                        onAdjustCoins={setAdjusting}
                        onProgress={t => setProgressTeamId(t.id)}
                        onViewMap={t => navigate(`/games/${gameId}/live-map`, { state: { focusTeamId: t.id } })}
                      />
                    );
                  })}
                </div>
              )}

              {unassigned.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-gray-500 mb-3">
                    {rich(cc.teamsPage.unassignedPlayers({ teamsLength: teams.length > 0 && (
                      <span className="ml-1 font-normal text-gray-400">{cc.teamsPage.dragIntoATeam}</span>
                    ) }))}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {unassigned.map(user => (
                      <DraggablePlayerChip key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DragOverlay>
            {activeUser && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-900 rounded-lg shadow-lg text-sm font-medium text-gray-900 cursor-grabbing">
                <span className="text-gray-400 text-xs">⠿</span>
                {activeUser.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {progressTeam && (
        <TeamProgressModal
          team={progressTeam}
          game={game}
          quests={quests}
          onApply={handleProgressAction}
          onClose={() => setProgressTeamId(null)}
        />
      )}

      {adjusting && (
        <CoinAdjustModal
          teamName={adjusting.name}
          balance={teamCoins(adjusting, economy)}
          onSave={handleAdjustCoins}
          onClose={() => setAdjusting(null)}
        />
      )}

      {selected && (
        <div className="fixed inset-0 z-20 bg-white flex flex-col md:relative md:inset-auto md:z-auto md:w-96 md:border-l md:border-gray-200 md:-mr-8 md:-my-8 md:shadow-sm">
          <TeamForm
            team={selected === 'new' ? null : selected}
            onSave={handleSaveTeam}
            onCancel={() => setSelected(null)}
            onDelete={handleDeleteTeam}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
