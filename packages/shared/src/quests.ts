import type { ContentBlock, Quest, QuestHint, QuestTask, QuestTrigger, QuestView } from './types';

const TRIGGERS: QuestTrigger[] = ['location', 'distance', 'none'];
const TASKS: QuestTask[] = ['answer', 'timer', 'continue'];

// Accepts legacy plain-string content as well as block arrays
export function toBlocks(value: unknown): ContentBlock[] {
  if (Array.isArray(value)) return value as ContentBlock[];
  if (typeof value === 'string' && value.trim()) return [{ type: 'text', text: value }];
  return [];
}

// Hints used to be plain strings; each one is now its own list of blocks,
// wrapped in a map because Firestore rejects an array of arrays
export function toHints(value: unknown): QuestHint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(hint => {
      const blocks =
        hint && typeof hint === 'object' && !Array.isArray(hint) && 'blocks' in hint
          ? toBlocks((hint as QuestHint).blocks)
          : toBlocks(hint);
      return { blocks };
    })
    .filter(hint => hint.blocks.length > 0);
}

// Fills in defaults for quests created before trigger/task existed
export function normalizeQuest(id: string, data: Record<string, any>): Quest {
  return {
    ...data,
    id,
    title: data.title ?? '',
    trigger: TRIGGERS.includes(data.trigger) ? data.trigger : 'location',
    task: TASKS.includes(data.task) ? data.task : 'answer',
    description: toBlocks(data.description),
    navigationHint: toBlocks(data.navigationHint),
    hints: toHints(data.hints),
    // Distance progress is shown unless a host turned it off
    showDistanceProgress: data.showDistanceProgress !== false,
    isActive: data.isActive ?? true,
  };
}

export function hasContent(blocks: ContentBlock[]): boolean {
  return blocks.some(b =>
    (b.type === 'text' && b.text.trim()) ||
    (b.type === 'image' && b.url.trim()) ||
    (b.type === 'youtube' && b.videoId),
  );
}

// Handles youtu.be, watch?v=, shorts/, embed/, live/ links and bare 11-char IDs
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const match = s.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/,
  );
  return match ? match[1] : null;
}

// ─── What a team sees of its quest ───────────────────────────────────────────
// Built by the server for each team, and by the console for its phone preview

export interface QuestProgress {
  unlockedAt: number | null;
  pausedMsAtUnlock: number;
  walkedMeters: number;
  editedAt?: number;   // hosts changed what the team sees of it, while the team was on it
}

// Everything the team may see of a quest at this point. Quests open from the
// start are unlocked as soon as the team reaches them, so their timers run.
export function questView(
  quest: Quest,
  progress: QuestProgress,
  hintsRevealed: number,
): QuestView {
  const unlocked = progress.unlockedAt !== null;
  const hints = quest.hints ?? [];
  return {
    questId: quest.id,
    trigger: quest.trigger,
    task: quest.task,
    navigationHint: quest.navigationHint,
    location: quest.trigger === 'location' ? quest.location : undefined,
    fenceRadius: quest.trigger === 'location' ? quest.fenceRadius ?? 50 : undefined,
    distanceMeters: quest.trigger === 'distance' ? quest.distanceMeters ?? 0 : undefined,
    showDistanceProgress: quest.trigger === 'distance' ? quest.showDistanceProgress !== false : undefined,
    durationSeconds: quest.task === 'timer' ? quest.durationSeconds ?? 0 : undefined,
    unlockedAt: progress.unlockedAt,
    pausedMsAtUnlock: progress.pausedMsAtUnlock,
    walkedMeters: progress.walkedMeters,
    ...(progress.editedAt ? { editedAt: progress.editedAt } : {}),
    title: unlocked ? quest.title : undefined,
    description: unlocked ? quest.description : undefined,
    hints: hints.slice(0, hintsRevealed),
    hintCount: hints.length,
  };
}
