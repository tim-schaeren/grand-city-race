import { consoleCopy as cc } from './copy';
import type { ContentBlock, Game, Quest, QuestTask, QuestTrigger } from './types';
import { parseYouTubeId } from './quests';
import { cleanQuest, TEXT_LIMITS } from './limits';

export const EXPORT_FORMAT = 'gcr-quests';
export const EXPORT_VERSION = 1;

// A game may hold at most this many quests, whether created by hand or imported
export const MAX_QUESTS_PER_GAME = 200;

const TRIGGERS: QuestTrigger[] = ['location', 'distance', 'none'];
const TASKS: QuestTask[] = ['answer', 'timer', 'continue'];

// Shipped inside every export so an LLM can edit the file without further context
export const HOW_TO_EDIT = [
  'Each quest has a trigger (what unlocks it) and a task (what the team does once unlocked).',
  "trigger 'location': add location {lat, lng} and fenceRadius in meters. The quest unlocks inside that circle.",
  "trigger 'distance': add distanceMeters. It unlocks once the team has travelled that far. Set showDistanceProgress false to hide how far the team has come.",
  "trigger 'none': unlocked immediately; no location or navigationHint.",
  "task 'answer': add answers, a list of accepted answers (matched case-insensitively, any one is enough). hints is optional and holds one entry per hint, each a string or a list of blocks like description.",
  "task 'timer': add durationSeconds (durationMinutes also accepted). Used for mandatory breaks.",
  "task 'continue': information only; the team reads it and taps continue.",
  'description is what players see once the quest is unlocked. navigationHint is shown before that, while they are on their way.',
  "Both are lists of blocks: {type:'text', text}, {type:'image', url, caption?} or {type:'youtube', videoId}.",
  'A plain string is accepted instead of a list and becomes a single text block. A YouTube URL is accepted instead of a videoId.',
  'Image URLs must be direct links to an image file (http or https), not links to a web page.',
  'The order of the quests list is the order players play them. isActive false hides a quest without deleting it.',
  'sourceId records where a quest came from and is ignored on import; importing always creates new quests.',
  `A game may hold at most ${MAX_QUESTS_PER_GAME} quests.`,
];

// Imported quests keep their content but get a distinct title, so a duplicate
// never has to be resolved by hand and no existing quest is touched.
export const COPY_SUFFIX = '_copy';

// Returns `title` when free, otherwise "title_copy", "title_copy2", … (compared case-insensitively)
export function uniqueQuestTitle(title: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map(t => t.trim().toLowerCase()));
  if (!used.has(title.trim().toLowerCase())) return title;
  // The title is shortened to make room for the suffix, so it stays within the limit
  const fit = (suffix: string) => `${title.slice(0, TEXT_LIMITS.questTitle - suffix.length)}${suffix}`;
  const base = fit(COPY_SUFFIX);
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = fit(`${COPY_SUFFIX}${n}`);
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

export interface QuestExportFile {
  format: string;
  version: number;
  exportedAt: string;
  game: { name: string; city: string };
  howToEdit: string[];
  quests: Record<string, unknown>[];
}

// Quest fields as they are written to Firestore (the id is assigned on import)
export type QuestImportData = Omit<Quest, 'id'>;

export interface ParsedQuestEntry {
  label: string;              // best-effort title for the preview list
  data: QuestImportData | null; // null when the quest cannot be imported
  errors: string[];
  warnings: string[];
}

export interface ParsedQuestExport {
  fileError: string | null;   // set when nothing at all could be read
  entries: ParsedQuestEntry[];
}

export function questToExportEntry(quest: Quest): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    title: quest.title,
    trigger: quest.trigger,
    task: quest.task,
  };
  if (quest.trigger === 'location') {
    entry.location = { lat: quest.location?.lat, lng: quest.location?.lng };
    entry.fenceRadius = quest.fenceRadius ?? 50;
  }
  if (quest.trigger === 'distance') {
    entry.distanceMeters = quest.distanceMeters;
    entry.showDistanceProgress = quest.showDistanceProgress !== false;
  }
  if (quest.trigger !== 'none') entry.navigationHint = quest.navigationHint;
  entry.description = quest.description;
  if (quest.task === 'answer') {
    entry.answers = quest.answers ?? [];
    if (quest.hints?.length) entry.hints = quest.hints.map(hint => hint.blocks);
  }
  if (quest.task === 'timer') entry.durationSeconds = quest.durationSeconds;
  entry.isActive = quest.isActive;
  entry.sourceId = quest.id;
  return entry;
}

export function buildQuestExport(game: Pick<Game, 'name' | 'city'>, quests: Quest[]): QuestExportFile {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    game: { name: game.name ?? '', city: game.city ?? '' },
    howToEdit: HOW_TO_EDIT,
    quests: quests.map(questToExportEntry),
  };
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

// LLMs often quote numbers, so accept a numeric string too
function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function toTrimmedStrings(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.filter(v => typeof v === 'string').map(v => (v as string).trim()).filter(Boolean);
}

function parseBlocks(value: unknown, field: string, errors: string[], warnings: string[]): ContentBlock[] {
  if (value == null) return [];
  if (typeof value === 'string') return value.trim() ? [{ type: 'text', text: value.trim() }] : [];
  if (!Array.isArray(value)) {
    errors.push(cc.questExport.mustBeAListOf({ field: field }));
    return [];
  }

  const blocks: ContentBlock[] = [];
  value.forEach((raw, i) => {
    const where = cc.questExport.block({ field, n: i + 1 });
    if (typeof raw === 'string') {
      if (raw.trim()) blocks.push({ type: 'text', text: raw.trim() });
      return;
    }
    if (!raw || typeof raw !== 'object') {
      errors.push(cc.questExport.isNotABlock({ where: where }));
      return;
    }
    const block = raw as Record<string, unknown>;
    const type = typeof block.type === 'string' ? block.type : '';

    if (type === 'text') {
      const text = typeof block.text === 'string' ? block.text.trim() : '';
      if (text) blocks.push({ type: 'text', text });
      else warnings.push(cc.questExport.hasNoTextAndWas({ where: where }));
      return;
    }
    if (type === 'image') {
      const url = typeof block.url === 'string' ? block.url.trim() : '';
      if (!/^https?:\/\//i.test(url)) {
        errors.push(cc.questExport.needsAnImageUrlStarting({ where: where }));
        return;
      }
      const caption = typeof block.caption === 'string' ? block.caption.trim() : '';
      blocks.push(caption ? { type: 'image', url, caption } : { type: 'image', url });
      return;
    }
    if (type === 'youtube') {
      const raw2 = [block.videoId, block.url, block.id].find(v => typeof v === 'string' && v.trim());
      const videoId = typeof raw2 === 'string' ? parseYouTubeId(raw2) : null;
      if (!videoId) {
        errors.push(cc.questExport.needsAYouTubeVideoId({ where: where }));
        return;
      }
      blocks.push({ type: 'youtube', videoId });
      return;
    }
    errors.push(cc.questExport.hasUnknownType({ where: where, jsonStringify: JSON.stringify(block.type ?? null) }));
  });
  return blocks;
}

function hasBlockContent(blocks: ContentBlock[]): boolean {
  return blocks.length > 0;
}

function parseQuestEntry(raw: unknown, index: number): ParsedQuestEntry {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { label: cc.questExport.quest({ index: index + 1 }), data: null, errors: [cc.questExport.notAQuestObject], warnings };
  }
  const q = raw as Record<string, unknown>;
  const title = typeof q.title === 'string' ? q.title.trim() : '';
  const label = title || cc.questExport.quest({ index: index + 1 });
  if (!title) errors.push(cc.questExport.titleIsRequired);
  else if (title.length > TEXT_LIMITS.questTitle) errors.push(cc.questExport.titleTooLong({ max: TEXT_LIMITS.questTitle }));

  let trigger = TRIGGERS.find(t => t === q.trigger);
  if (!trigger) {
    if (q.trigger == null) warnings.push(cc.questExport.noTriggerGivenTreatedAs);
    else errors.push(cc.questExport.triggerMustBeOneOf({ triggersJoin: TRIGGERS.join(', ') }));
    trigger = 'location';
  }

  let task = TASKS.find(t => t === q.task);
  if (!task) {
    if (q.task == null) warnings.push(cc.questExport.noTaskGivenTreatedAs);
    else errors.push(cc.questExport.taskMustBeOneOf({ tasksJoin: TASKS.join(', ') }));
    task = 'answer';
  }

  const description = parseBlocks(q.description, 'description', errors, warnings);
  if (!hasBlockContent(description)) errors.push(cc.questExport.descriptionIsRequired);

  const navigationHint = parseBlocks(q.navigationHint, 'navigationHint', errors, warnings);

  const data: QuestImportData = {
    title,
    trigger,
    task,
    description,
    navigationHint: trigger === 'none' ? [] : navigationHint,
    isActive: typeof q.isActive === 'boolean' ? q.isActive : true,
  };

  if (trigger === 'none' && hasBlockContent(navigationHint)) {
    warnings.push(cc.questExport.navigationHintIsUnusedWithTrigger);
  }

  if (trigger === 'location') {
    if (!hasBlockContent(navigationHint)) errors.push(cc.questExport.navigationHintIsRequiredForA);
    const loc = (q.location ?? {}) as Record<string, unknown>;
    const lat = toNumber(loc.lat);
    const lng = toNumber(loc.lng);
    if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.push(cc.questExport.locationNeedsAValidLat);
    } else {
      data.location = { lat, lng };
    }
    const radius = toNumber(q.fenceRadius);
    if (radius == null) warnings.push(cc.questExport.noFenceRadiusGivenUsing50);
    else if (radius <= 0) errors.push(cc.questExport.fenceRadiusMustBeAPositive);
    data.fenceRadius = radius != null && radius > 0 ? radius : 50;
  }

  if (trigger === 'distance') {
    const meters = toNumber(q.distanceMeters);
    if (meters == null || meters <= 0) errors.push(cc.questExport.distanceMetersMustBeAPositive);
    else data.distanceMeters = meters;
    data.showDistanceProgress = q.showDistanceProgress !== false;
  }

  if (task === 'answer') {
    const answers = toTrimmedStrings(q.answers);
    if (!answers.length) errors.push(cc.questExport.answersNeedsAtLeastOne);
    else data.answers = answers;
    // A hint may be a plain string or a list of blocks, like description
    const hints = Array.isArray(q.hints)
      ? q.hints
          .map((hint, i) => parseBlocks(hint, cc.questExport.hint({ n: i + 1 }), errors, warnings))
          .filter(blocks => blocks.length > 0)
          .map(blocks => ({ blocks }))
      : [];
    if (hints.length) data.hints = hints;
  }

  if (task === 'timer') {
    const minutes = toNumber(q.durationMinutes);
    const seconds = toNumber(q.durationSeconds) ?? (minutes != null ? minutes * 60 : null);
    if (seconds == null || seconds <= 0) errors.push(cc.questExport.durationSecondsMustBeAPositive);
    else data.durationSeconds = Math.round(seconds);
  }

  const clean = cleanQuest(data);
  if (JSON.stringify(clean) !== JSON.stringify(data)) warnings.push(cc.questExport.shortened);
  return { label, data: errors.length ? null : clean, errors, warnings };
}

export function parseQuestExport(text: string): ParsedQuestExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { fileError: cc.questExport.thisIsNotAValid, entries: [] };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { fileError: cc.questExport.expectedAJsonObjectWith, entries: [] };
  }

  const file = parsed as Record<string, unknown>;
  if (typeof file.format === 'string' && file.format !== EXPORT_FORMAT) {
    return { fileError: cc.questExport.unknownFormatExpected({ jsonStringify: JSON.stringify(file.format), exportFormat: EXPORT_FORMAT }), entries: [] };
  }
  const version = toNumber(file.version);
  if (version != null && version > EXPORT_VERSION) {
    return { fileError: cc.questExport.thisFileWasMadeBy({ version: version }), entries: [] };
  }
  if (!Array.isArray(file.quests)) {
    return { fileError: cc.questExport.expectedAQuestsList, entries: [] };
  }
  if (file.quests.length === 0) {
    return { fileError: cc.questExport.thisFileContainsNoQuests, entries: [] };
  }
  if (file.quests.length > MAX_QUESTS_PER_GAME) {
    return {
      fileError: cc.questExport.thisFileContainsQuestsAt({ questsLength: file.quests.length, maxQuestsPerGame: MAX_QUESTS_PER_GAME }),
      entries: [],
    };
  }

  return { fileError: null, entries: file.quests.map(parseQuestEntry) };
}
