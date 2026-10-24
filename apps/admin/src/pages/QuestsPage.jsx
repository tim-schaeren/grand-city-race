import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect, useRef } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, setDoc, getDoc, writeBatch,
} from 'firebase/firestore';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { normalizeQuest, buildQuestExport, MAX_QUESTS_PER_GAME } from '@grandcityrace/shared';
import { db } from '../firebase';
import QuestForm from '../components/QuestForm';
import QuestImportModal from '../components/QuestImportModal';
import { TRIGGER_OPTIONS, TASK_OPTIONS } from '../utils/questOptions';
import { downloadJson, slugify } from '../utils/download';

const optionLabel = (options, value) => options.find(o => o.value === value)?.label ?? value;

function QuestRow({ quest, index, isSelected, onClick, onToggle, onViewMap }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: quest.id });

  return (
    <div
      id={`quest-row-${quest.id}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onClick(quest)}
      className={`flex items-center gap-3 bg-white border rounded-lg px-4 py-3 cursor-pointer transition-colors
        ${isDragging ? 'shadow-lg opacity-75' : ''}
        ${isSelected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'}`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        style={{ touchAction: 'none' }}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing select-none"
      >
        ⠿
      </button>
      <span className="text-sm text-gray-400 w-6 text-center">{index + 1}</span>
      <span className="flex-1 text-sm font-medium text-gray-900">{quest.title}</span>
      <span className="hidden sm:inline text-xs text-gray-400 shrink-0">
        {optionLabel(TRIGGER_OPTIONS, quest.trigger)} · {optionLabel(TASK_OPTIONS, quest.task)}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${quest.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {quest.isActive ? cc.questsPage.active : cc.questsPage.inactive}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onToggle(quest); }}
        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        {quest.isActive ? cc.questsPage.deactivate : cc.questsPage.activate}
      </button>
      {quest.location?.lat && (
        <button
          onClick={e => { e.stopPropagation(); onViewMap(quest); }}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
        >
          {cc.questsPage.map}
        </button>
      )}
    </div>
  );
}

export default function QuestsPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const gameDoc = doc(db, 'games', gameId);

  const [game, setGame] = useState(null);
  const [quests, setQuests] = useState({});
  const [questOrder, setQuestOrder] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const isDirty = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  useEffect(() => {
    return onSnapshot(gameDoc, snap => {
      if (snap.exists()) setGame({ id: snap.id, ...snap.data() });
      setQuestOrder(snap.exists() ? (snap.data().questOrder ?? []) : []);
    });
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(collection(db, 'games', gameId, 'quests'), snap => {
      const map = {};
      snap.forEach(d => { map[d.id] = normalizeQuest(d.id, d.data()); });
      setQuests(map);
    });
  }, [gameId]);

  // Rejected answers, for tuning a quest whose answer list is too strict
  useEffect(() => {
    return onSnapshot(collection(db, 'games', gameId, 'attempts'), snap =>
      setAttempts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [gameId]);

  // Open quest from navigation state (e.g. clicked from live map)
  useEffect(() => {
    const id = location.state?.highlightQuestId;
    if (!id || !quests[id]) return;
    setSelected(quests[id]);
    setTimeout(() => {
      document.getElementById(`quest-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [location.state?.highlightQuestId, quests]);

  const orderedQuests = questOrder
    .map(id => quests[id])
    .filter(Boolean)
    .concat(Object.values(quests).filter(q => !questOrder.includes(q.id)));

  const existingTitles = Object.values(quests).map(q => q.title);
  const atQuestLimit = orderedQuests.length >= MAX_QUESTS_PER_GAME;
  // A running game: imported quests arrive inactive so they don't lengthen the race
  const isLive = !!game && !game.endedAt && Date.now() >= game.startDateTime;

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`quests-${slugify(game?.name)}-${date}.json`, buildQuestExport(game ?? {}, orderedQuests));
  }

  // Creates new quest documents only; existing quests and their ids are left untouched,
  // so team progress (currentQuestId / completedQuestIds) cannot break.
  async function handleImport(questsToImport) {
    setImporting(true);
    try {
      const batch = writeBatch(db);
      const newIds = [];
      for (const data of questsToImport) {
        const ref = doc(collection(db, 'games', gameId, 'quests'));
        batch.set(ref, isLive ? { ...data, isActive: false } : data);
        newIds.push(ref.id);
      }
      batch.set(gameDoc, { questOrder: [...questOrder, ...newIds] }, { merge: true });
      await batch.commit();
      setImportOpen(false);
    } finally {
      setImporting(false);
    }
  }

  function tryClose(callback) {
    if (isDirty.current && !confirm(cc.questsPage.youHaveUnsavedChangesDiscard)) return;
    isDirty.current = false;
    callback?.();
  }

  function handleRowClick(quest) {
    if (selected && selected !== 'new' && selected.id === quest.id) {
      tryClose(() => setSelected(null));
    } else {
      tryClose(() => setSelected(quest));
    }
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const newOrder = arrayMove(questOrder, questOrder.indexOf(active.id), questOrder.indexOf(over.id));
    setQuestOrder(newOrder);
    await setDoc(gameDoc, { questOrder: newOrder }, { merge: true });
  }

  async function handleSave(data) {
    setSaving(true);
    try {
      if (selected === 'new') {
        const ref = await addDoc(collection(db, 'games', gameId, 'quests'), data);
        await setDoc(gameDoc, { questOrder: [...questOrder, ref.id] }, { merge: true });
      } else {
        // Replace rather than merge so fields from a previous trigger/task don't linger
        await setDoc(doc(db, 'games', gameId, 'quests', selected.id), data);
      }
      isDirty.current = false;
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(quest) {
    await updateDoc(doc(db, 'games', gameId, 'quests', quest.id), { isActive: !quest.isActive });
  }

  async function handleDelete() {
    if (!selected || selected === 'new') return;
    await deleteDoc(doc(db, 'games', gameId, 'quests', selected.id));
    await setDoc(gameDoc, { questOrder: questOrder.filter(id => id !== selected.id) }, { merge: true });
    isDirty.current = false;
    setSelected(null);
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{cc.questsPage.quests}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={!orderedQuests.length}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {cc.questsPage.export}
            </button>
            <button
              onClick={() => tryClose(() => setImportOpen(true))}
              disabled={atQuestLimit}
              title={atQuestLimit ? cc.questsPage.aGameMayHoldAt({ maxQuestsPerGame: MAX_QUESTS_PER_GAME }) : undefined}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {cc.questsPage.import}
            </button>
            <button
              onClick={() => tryClose(() => setSelected('new'))}
              disabled={atQuestLimit}
              title={atQuestLimit ? cc.questsPage.aGameMayHoldAt({ maxQuestsPerGame: MAX_QUESTS_PER_GAME }) : undefined}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {cc.questsPage.newQuest}
            </button>
          </div>
        </div>

        {atQuestLimit && (
          <p className="text-xs text-yellow-600 mb-4">
            {cc.questsPage.thisGameHasReachedThe({ maxQuestsPerGame: MAX_QUESTS_PER_GAME })}
          </p>
        )}

        {orderedQuests.length === 0 ? (
          <p className="text-gray-400">{cc.questsPage.noQuestsYetCreateThe}</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedQuests.map((quest, i) => (
                  <QuestRow
                    key={quest.id}
                    quest={quest}
                    index={i}
                    isSelected={selected && selected !== 'new' && selected.id === quest.id}
                    onClick={handleRowClick}
                    onToggle={handleToggle}
                    onViewMap={q => navigate(`/games/${gameId}/live-map`, { state: { focusQuestId: q.id } })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {importOpen && (
        <QuestImportModal
          existingTitles={existingTitles}
          existingCount={orderedQuests.length}
          isLive={isLive}
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
          importing={importing}
        />
      )}

      {selected && (
        <div className="fixed inset-0 z-20 bg-white flex flex-col md:relative md:inset-auto md:z-auto md:w-96 md:border-l md:border-gray-200 md:-mr-8 md:-my-8 md:shadow-sm">
          <QuestForm
            quest={selected === 'new' ? null : selected}
            existingTitles={existingTitles}
            attempts={selected === 'new' ? [] : attempts.filter(a => a.questId === selected.id)}
            cityCoordinates={game?.cityCoordinates}
            onSave={handleSave}
            onCancel={() => tryClose(() => setSelected(null))}
            onDelete={handleDelete}
            onDirtyChange={dirty => { isDirty.current = dirty; }}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
