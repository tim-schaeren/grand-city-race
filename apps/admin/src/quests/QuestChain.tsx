import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { closestCenter, DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  buildQuestExport, consoleCopy as cc, hasStarted, MAX_QUESTS_PER_GAME, paths, type ContentBlock, type Quest,
} from '@grandcityrace/shared';
import { db } from '../firebase';
import QuestImportModal from '../components/QuestImportModal';
import { useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { useQuests } from '../data/quests';
import { to } from '../shell/to';
import { Button } from '../ui/Button';
import { Page } from '../ui/Page';
import { Empty, Show } from '../ui/States';
import { Status } from '../ui/Status';
import { downloadJson, slugify } from '../utils/download';
import { TASK_OPTIONS, TRIGGER_OPTIONS } from '../utils/questOptions';

const optionLabel = (options: { value: string; label: string }[], value: string) =>
  options.find(o => o.value === value)?.label ?? value;

const plainText = (blocks: ContentBlock[]) =>
  blocks.flatMap(b => (b.type === 'text' ? [b.text] : [])).join(' ');

// The quests in the order teams play them, each with what teams read on the
// way and on arriving, so a host sees where one quest hands over to the next
export default function QuestChain() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  const quests = useQuests(gameId);
  return (
    <Show live={quests}>
      {list => {
        const g = dataOr(game, null);
        return g ? <Chain game={g} quests={list} /> : null;
      }}
    </Show>
  );
}

function Chain({ game, quests }: { game: GameWithId; quests: Quest[] }) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }));

  // The order as just dragged, until the game document brings it back
  const questOrder = order ?? game.questOrder ?? [];
  const byId = new Map(quests.map(q => [q.id, q]));
  const ordered = [
    ...questOrder.flatMap(id => byId.get(id) ?? []),
    ...quests.filter(q => !questOrder.includes(q.id)),
  ];
  const atLimit = quests.length >= MAX_QUESTS_PER_GAME;
  // A running game: imported quests arrive switched off so they don't lengthen the race
  const isLive = !game.endedAt && hasStarted(game, Date.now());

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(questOrder, questOrder.indexOf(String(active.id)), questOrder.indexOf(String(over.id)));
    setOrder(next);
    try {
      await setDoc(doc(db, paths.game(game.id)), { questOrder: next }, { merge: true });
    } finally {
      setOrder(null);
    }
  }

  function exportQuests() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`quests-${slugify(game.name)}-${date}.json`, buildQuestExport(game, ordered));
  }

  // Creates new quests only; existing ones keep their ids, so no team's progress breaks
  async function importQuests(toImport: Omit<Quest, 'id'>[]) {
    setImporting(true);
    try {
      const batch = writeBatch(db);
      const ids = toImport.map(data => {
        const ref = doc(collection(db, paths.quests(game.id)));
        batch.set(ref, isLive ? { ...data, isActive: false } : data);
        return ref.id;
      });
      batch.set(doc(db, paths.game(game.id)), { questOrder: [...questOrder, ...ids] }, { merge: true });
      await batch.commit();
      setImportOpen(false);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Page
      title={cc.questsPage.quests}
      description={cc.questsPage.description}
      actions={
        <>
          <Button onClick={exportQuests} disabled={!ordered.length}>{cc.questsPage.export}</Button>
          <Button onClick={() => setImportOpen(true)} disabled={atLimit}>{cc.questsPage.import}</Button>
          <Button tone="primary" onClick={() => navigate(to.quest(game.id, 'new'))} disabled={atLimit}>{cc.questsPage.newQuest}</Button>
        </>
      }
    >
      {atLimit && <p className="mb-4 text-xs text-yellow-700">{cc.questsPage.thisGameHasReachedThe({ maxQuestsPerGame: MAX_QUESTS_PER_GAME })}</p>}

      {ordered.length === 0 ? (
        <Empty
          title={cc.questsPage.noQuestsYetCreateThe}
          action={<Button tone="primary" onClick={() => navigate(to.quest(game.id, 'new'))}>{cc.questsPage.newQuest}</Button>}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={questOrder} strategy={verticalListSortingStrategy}>
            <ol>
              {ordered.map((quest, i) => (
                <ChainLink key={quest.id} quest={quest} number={i + 1} last={i === ordered.length - 1} onOpen={() => navigate(to.quest(game.id, quest.id))} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {importOpen && (
        <QuestImportModal
          existingTitles={quests.map(q => q.title)}
          existingCount={quests.length}
          isLive={isLive}
          onImport={importQuests}
          onClose={() => setImportOpen(false)}
          importing={importing}
        />
      )}
    </Page>
  );
}

function ChainLink({ quest, number, last, onOpen }: { quest: Quest; number: number; last: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quest.id });
  const onTheWay = quest.trigger === 'none' ? null : plainText(quest.navigationHint);
  const arrived = plainText(quest.description);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'relative z-10' : ''}>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={e => e.key === 'Enter' && onOpen()}
        className={`flex cursor-pointer gap-3 rounded-lg border bg-white px-4 py-3 transition-colors hover:border-gray-400 ${
          isDragging ? 'border-gray-900 shadow-lg' : 'border-gray-200'
        } ${quest.isActive ? '' : 'opacity-60'}`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          style={{ touchAction: 'none' }}
          className="cursor-grab select-none self-start pt-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        >
          ⠿
        </button>
        <span className="w-6 shrink-0 pt-0.5 text-center text-sm text-gray-400">{number}</span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-gray-900">{quest.title}</span>
            <span className="text-xs text-gray-400">{optionLabel(TRIGGER_OPTIONS, quest.trigger)} · {optionLabel(TASK_OPTIONS, quest.task)}</span>
            {!quest.isActive && <Status>{cc.questsPage.skipped}</Status>}
          </div>
          {onTheWay !== null && <Excerpt label={cc.questsPage.onTheWay} text={onTheWay} />}
          <Excerpt label={cc.questsPage.whenTheyArrive} text={arrived} />
        </div>
      </div>
      {/* The handover to the next quest */}
      {!last && <div className="ml-[3.25rem] h-4 border-l-2 border-dotted border-gray-300" />}
    </li>
  );
}

function Excerpt({ label, text }: { label: string; text: string }) {
  return (
    <p className="line-clamp-2 text-xs text-gray-600">
      <span className="font-medium text-gray-400">{label}: </span>
      {text || <span className="italic text-gray-400">{cc.questsPage.nothingWritten}</span>}
    </p>
  );
}
