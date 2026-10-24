import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useMemo, useState } from 'react';
import { parseQuestExport, uniqueQuestTitle, MAX_QUESTS_PER_GAME } from '@grandcityrace/shared';
import { TRIGGER_OPTIONS, TASK_OPTIONS } from '../utils/questOptions';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const label = (options, value) => options.find(o => o.value === value)?.label ?? value;

function summary(data) {
  const parts = [label(TRIGGER_OPTIONS, data.trigger)];
  if (data.trigger === 'distance') parts[0] += ` ${data.distanceMeters} m`;
  if (data.trigger === 'location') parts[0] += cc.questImportModal.mFence({ dataFenceRadius: data.fenceRadius });
  let task = label(TASK_OPTIONS, data.task);
  if (data.task === 'timer') task += ` ${Math.round(data.durationSeconds / 60)} min`;
  if (data.task === 'answer') task += cc.questImportModal.answer({ answersLength: data.answers.length, answersLength2: data.answers.length === 1 ? '' : 's' });
  parts.push(task);
  return parts.join(' · ');
}

export default function QuestImportModal({ existingTitles, existingCount, isLive, onImport, onClose, importing }) {
  const [fileName, setFileName] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [entries, setEntries] = useState([]);
  const [skipped, setSkipped] = useState(() => new Set());

  // Quests to be written, with duplicate titles renamed. Titles already in the game
  // and titles taken by earlier quests in this import both count as duplicates.
  const prepared = useMemo(() => {
    const taken = [...(existingTitles ?? [])];
    return entries.map((entry, i) => {
      if (!entry.data || skipped.has(i)) return null;
      const title = uniqueQuestTitle(entry.data.title, taken);
      taken.push(title);
      return { data: { ...entry.data, title }, renamed: title !== entry.data.title };
    });
  }, [entries, skipped, existingTitles]);

  const importable = prepared.filter(Boolean).map(p => p.data);
  const failedCount = entries.filter(e => !e.data).length;
  const overCap = existingCount + importable.length > MAX_QUESTS_PER_GAME;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setEntries([]);
    setSkipped(new Set());
    if (file.size > MAX_FILE_BYTES) {
      setFileError(cc.questImportModal.thatFileIsTooLarge);
      return;
    }
    const result = parseQuestExport(await file.text());
    setFileError(result.fileError);
    setEntries(result.entries);
  }

  function toggle(index) {
    setSkipped(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-full flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{cc.questImportModal.importQuests}</h2>
          <p className="text-xs text-gray-400 mt-1">
            {cc.questImportModal.importedQuestsAreAddedTo}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <span className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                {cc.questImportModal.chooseJsonFile}
              </span>
              <input type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
              {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
            </label>
          </div>

          {fileError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{fileError}</p>
            </div>
          )}

          {isLive && entries.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-700">
                {rich(cc.questImportModal.thisGameIsAlreadyRunning({ span: <span className="font-medium">{cc.questImportModal.inactive}</span> }))}
              </p>
            </div>
          )}

          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((entry, i) => {
                const ok = !!entry.data;
                const selected = ok && !skipped.has(i);
                return (
                  <div
                    key={i}
                    className={`border rounded-lg px-3 py-2 ${ok ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!ok}
                        onChange={() => toggle(i)}
                        className="mt-1 accent-gray-900"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${ok ? 'text-gray-900' : 'text-red-700'}`}>{entry.label}</p>
                        {ok && <p className="text-xs text-gray-400 mt-0.5">{summary(entry.data)}</p>}
                        {prepared[i]?.renamed && (
                          <p className="text-xs text-yellow-600 mt-0.5">
                            {cc.questImportModal.aQuestWithThisTitle({ prepared: prepared[i].data.title })}
                          </p>
                        )}
                        {entry.errors.map((e, j) => (
                          <p key={j} className="text-xs text-red-600 mt-0.5">{e}</p>
                        ))}
                        {entry.warnings.map((w, j) => (
                          <p key={j} className="text-xs text-gray-400 mt-0.5">{w}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {overCap && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">
                {cc.questImportModal.thisGameHasQuestsAnd({ existingCount: existingCount, maxQuestsPerGame: MAX_QUESTS_PER_GAME, existingCount2: existingCount + importable.length - MAX_QUESTS_PER_GAME })}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {entries.length > 0 && cc.questImportModal.ofSelected({ importableLength: importable.length, entriesLength: entries.length })}
            {failedCount > 0 && cc.questImportModal.cannotBeImported({ failedCount: failedCount })}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
            >
              {cc.questImportModal.cancel}
            </button>
            <button
              onClick={() => onImport(importable)}
              disabled={!importable.length || overCap || importing}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? cc.questImportModal.importing : cc.questImportModal.importQuest({ importableLength: importable.length || '', importableLength2: importable.length === 1 ? '' : 's' }).trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
