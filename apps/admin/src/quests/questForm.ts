import {
  consoleCopy as cc, hasContent, type ContentBlock, type Quest, type QuestTask, type QuestTrigger,
} from '@grandcityrace/shared';
import { blockErrors, toContentBlocks, toEditorBlocks } from '../utils/contentBlocks';

// A text, picture or video as the editor holds it: a video keeps the link the
// host pasted until it's saved
export type EditorBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'youtube'; url: string };

// The quest being edited. Numbers stay text while they're typed.
export interface QuestForm {
  title: string;
  trigger: QuestTrigger;
  task: QuestTask;
  navigationHint: EditorBlock[];
  location: { lat: string; lng: string };
  fenceRadius: string;
  distanceMeters: string;
  showDistanceProgress: boolean;
  description: EditorBlock[];
  answers: string[];
  hints: EditorBlock[][];
  durationMinutes: string;
  isActive: boolean;
}

export type QuestData = Omit<Quest, 'id'>;
export type FormErrors = Partial<Record<keyof QuestForm, string>>;

const textBlock = (): EditorBlock[] => [{ type: 'text', text: '' }];

export const EMPTY_FORM: QuestForm = {
  title: '',
  trigger: 'location',
  task: 'answer',
  navigationHint: textBlock(),
  location: { lat: '', lng: '' },
  fenceRadius: '50',
  distanceMeters: '500',
  showDistanceProgress: true,
  description: textBlock(),
  answers: [''],
  hints: [],
  durationMinutes: '15',
  isActive: true,
};

const editorBlocks = (blocks: ContentBlock[]): EditorBlock[] => (blocks.length ? toEditorBlocks(blocks) : textBlock());

export function toForm(quest: Quest | null): QuestForm {
  if (!quest) return EMPTY_FORM;
  return {
    title: quest.title,
    trigger: quest.trigger,
    task: quest.task,
    navigationHint: editorBlocks(quest.navigationHint),
    location: { lat: String(quest.location?.lat ?? ''), lng: String(quest.location?.lng ?? '') },
    fenceRadius: String(quest.fenceRadius ?? 50),
    distanceMeters: String(quest.distanceMeters ?? 500),
    showDistanceProgress: quest.showDistanceProgress !== false,
    description: editorBlocks(quest.description),
    answers: quest.answers?.length ? quest.answers : [''],
    hints: (quest.hints ?? []).map(hint => toEditorBlocks(hint.blocks)),
    durationMinutes: String(quest.durationSeconds != null ? quest.durationSeconds / 60 : 15),
    isActive: quest.isActive,
  };
}

// The quest as it's stored. Only what its trigger and task use is kept, since
// saving replaces the whole document.
export function toQuestData(form: QuestForm): QuestData {
  const data: QuestData = {
    title: form.title.trim(),
    trigger: form.trigger,
    task: form.task,
    description: toContentBlocks(form.description),
    navigationHint: form.trigger === 'none' ? [] : toContentBlocks(form.navigationHint),
    isActive: form.isActive,
  };
  if (form.trigger === 'location') {
    data.fenceRadius = parseFloat(form.fenceRadius);
    data.location = { lat: parseFloat(form.location.lat), lng: parseFloat(form.location.lng) };
  }
  if (form.trigger === 'distance') {
    data.distanceMeters = parseFloat(form.distanceMeters);
    data.showDistanceProgress = form.showDistanceProgress;
  }
  if (form.task === 'answer') {
    data.answers = form.answers.map(a => a.trim()).filter(Boolean);
    // Each hint is stored as a map: Firestore rejects an array of arrays
    data.hints = form.hints.map(hint => toContentBlocks(hint)).filter(blocks => blocks.length > 0).map(blocks => ({ blocks }));
  }
  if (form.task === 'timer') data.durationSeconds = Math.round(parseFloat(form.durationMinutes) * 60);
  return data;
}

// The quest as typed so far, for the phone preview: half-typed numbers count as none
export function toPreviewQuest(form: QuestForm, id: string): Quest {
  const data = toQuestData(form);
  const number = (n: number | undefined) => (Number.isFinite(n) ? n : undefined);
  return {
    ...data,
    id,
    title: data.title || cc.questEditor.untitled,
    fenceRadius: number(data.fenceRadius),
    distanceMeters: number(data.distanceMeters),
    durationSeconds: number(data.durationSeconds),
    location: data.location && Number.isFinite(data.location.lat) && Number.isFinite(data.location.lng) ? data.location : undefined,
  };
}

const positive = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0;
};

// What's missing or wrong, by field. Nothing is saved until this is empty.
export function validate(form: QuestForm, otherTitles: string[]): FormErrors {
  const e: FormErrors = {};
  const title = form.title.trim();
  if (!title) e.title = cc.questForm.titleIsRequired;
  else if (otherTitles.includes(title)) e.title = cc.questForm.aQuestWithThisTitle;

  e.description = blockErrors(form.description)
    ?? (hasContent(toContentBlocks(form.description)) ? undefined : cc.questForm.descriptionIsRequired);

  if (form.trigger === 'location') {
    e.navigationHint = blockErrors(form.navigationHint)
      ?? (hasContent(toContentBlocks(form.navigationHint)) ? undefined : cc.questForm.navigationHintIsRequired);
    if (!positive(form.fenceRadius)) e.fenceRadius = cc.questForm.fenceRadiusMustBeA;
    if (!form.location.lat || !form.location.lng || !Number.isFinite(parseFloat(form.location.lat)) || !Number.isFinite(parseFloat(form.location.lng))) {
      e.location = cc.questForm.aValidLocationIsRequired;
    }
  }
  if (form.trigger === 'distance') {
    e.navigationHint = blockErrors(form.navigationHint) ?? undefined;
    if (!positive(form.distanceMeters)) e.distanceMeters = cc.questForm.distanceMustBeAPositive;
  }
  if (form.task === 'answer') {
    if (!form.answers.some(a => a.trim())) e.answers = cc.questForm.atLeastOneAnswerIs;
    const hintError = form.hints.map(hint => blockErrors(hint)).find(Boolean);
    if (hintError) e.hints = hintError;
  }
  if (form.task === 'timer' && !positive(form.durationMinutes)) e.durationMinutes = cc.questForm.durationMustBeAPositive;

  for (const key of Object.keys(e) as (keyof QuestForm)[]) if (!e[key]) delete e[key];
  return e;
}
