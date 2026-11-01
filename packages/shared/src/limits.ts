// How long or how large anything people type may be, in one place for the
// app, the console, the server and the database rules. firestore.rules can't
// import this file: its numbers are written out there and must match.

import type { ContentBlock, Quest, QuestHint } from './types';

export const TEXT_LIMITS = {
  // People and teams
  userName: 60,
  email: 200,
  password: 128,
  teamName: 40,

  // A game's settings
  gameName: 60,
  city: 60,
  hotline: 30,
  timeZone: 64,

  // A quest
  questTitle: 80,
  answer: 100,
  textBlock: 4000,
  caption: 200,
  imageUrl: 2000,
  videoId: 20,

  // During the race
  chat: 1000,
  note: 500,
  coinReason: 200,
  pushTitle: 100,
  pushBody: 300,
  typedAnswer: 200,
  search: 100,
} as const;

// How many of something a list may hold
export const COUNT_LIMITS = {
  blocks: 30,        // content blocks in a description, navigation hint or hint
  hints: 10,
  answers: 30,
} as const;

// Ranges for numbers hosts set. Wide enough for any real race; they keep out
// typos and values that break the maths, not unusual races.
export const NUMBER_LIMITS = {
  fenceRadius: { min: 1, max: 5_000 },              // metres
  distanceMeters: { min: 1, max: 100_000 },          // metres
  durationSeconds: { min: 1, max: 24 * 60 * 60 },
  maxTeamSize: { min: 1, max: 100 },
  maxTeamSpreadMeters: { min: 1, max: 100_000 },
  coins: { min: 0, max: 100_000 },                   // starting coins, per quest, hint cost, prices, caps
  itemMinutes: { min: 1, max: 24 * 60 },
  percent: { min: 0, max: 100 },
} as const;

// A host's number, kept inside its range and whole; anything not a number
// falls back
export function clampNumber(value: unknown, range: { min: number; max: number }, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

// Cut to length only; what the console saved is otherwise left as it is
const clip = (s: unknown, max: number) => (typeof s === 'string' && s.trim() ? s.slice(0, max) : '');

function cleanBlocks(blocks: unknown): ContentBlock[] {
  // Quests from before content blocks hold plain text
  if (typeof blocks === 'string') return clip(blocks, TEXT_LIMITS.textBlock) ? [{ type: 'text', text: clip(blocks, TEXT_LIMITS.textBlock) }] : [];
  if (!Array.isArray(blocks)) return [];
  const out: ContentBlock[] = [];
  for (const raw of blocks.slice(0, COUNT_LIMITS.blocks)) {
    const b = (raw ?? {}) as Record<string, unknown>;
    if (b.type === 'text') {
      const text = clip(b.text, TEXT_LIMITS.textBlock);
      if (text) out.push({ type: 'text', text });
    } else if (b.type === 'image') {
      const url = clip(b.url, TEXT_LIMITS.imageUrl);
      const caption = clip(b.caption, TEXT_LIMITS.caption);
      if (/^https?:\/\//i.test(url)) out.push(caption ? { type: 'image', url, caption } : { type: 'image', url });
    } else if (b.type === 'youtube') {
      const videoId = clip(b.videoId, TEXT_LIMITS.videoId);
      if (/^[A-Za-z0-9_-]+$/.test(videoId)) out.push({ type: 'youtube', videoId });
    }
  }
  return out;
}

const range = (value: unknown, r: { min: number; max: number }) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(r.max, Math.max(r.min, value)) : undefined;

// A quest as it may be stored: text clipped to its limits, lists cut to their
// counts, numbers kept in range, and blocks that aren't blocks dropped. The
// console saves quests straight to the database and the rules can't look
// inside lists, so the server runs this after every save too.
export function cleanQuest<T extends Partial<Quest>>(quest: T): T {
  const q: Record<string, unknown> = { ...quest };
  if ('title' in q) q.title = clip(q.title, TEXT_LIMITS.questTitle);
  if ('description' in q) q.description = cleanBlocks(q.description);
  if ('navigationHint' in q) q.navigationHint = cleanBlocks(q.navigationHint);
  if ('answers' in q) {
    q.answers = (Array.isArray(q.answers) ? q.answers : [])
      .map(a => clip(a, TEXT_LIMITS.answer)).filter(Boolean).slice(0, COUNT_LIMITS.answers);
  }
  if ('hints' in q) {
    q.hints = (Array.isArray(q.hints) ? q.hints : [])
      .map(h => ({ blocks: cleanBlocks((h as QuestHint | null)?.blocks) }))
      .filter(h => h.blocks.length > 0).slice(0, COUNT_LIMITS.hints);
  }
  for (const key of ['fenceRadius', 'distanceMeters', 'durationSeconds'] as const) {
    if (key in q) {
      const n = range(q[key], NUMBER_LIMITS[key]);
      if (n === undefined) delete q[key];
      else q[key] = key === 'durationSeconds' ? Math.round(n) : n;
    }
  }
  return q as T;
}
