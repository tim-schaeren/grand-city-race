import { questView } from './quests';
import type { Quest, QuestView } from './types';

// The console's phone preview: the app's own quest screens, built for the
// web, in a frame beside the quest editor. The console sends what to show;
// the frame says when it's ready to be told.

// The moments of a quest a host can look at
export type PreviewMoment = 'onTheWay' | 'compass' | 'radar' | 'arrived' | 'hint' | 'wrong';

export interface PreviewScene {
  moment: PreviewMoment;
  quest: QuestView;
  themeId?: string;
  questNumber: number;
  totalQuests: number;
  coins: number;
  hintCost: number;
}

export const PREVIEW_SCENE = 'gcr-preview-scene';
export const PREVIEW_READY = 'gcr-preview-ready';

// The moments a quest has: one on the way there only if it must be found,
// a compass and radar only for a place, hints and wrong answers only for an answer
export function previewMoments(quest: Pick<Quest, 'trigger' | 'task' | 'hints'>): PreviewMoment[] {
  return [
    ...(quest.trigger !== 'none' ? ['onTheWay' as const] : []),
    ...(quest.trigger === 'location' ? ['compass' as const, 'radar' as const] : []),
    'arrived' as const,
    ...(quest.task === 'answer' && (quest.hints?.length ?? 0) > 0 ? ['hint' as const] : []),
    ...(quest.task === 'answer' ? ['wrong' as const] : []),
  ];
}

// What a team would see of the quest at that moment, as the server builds it
export function previewQuestView(quest: Quest, moment: PreviewMoment, now: number): QuestView {
  const arrived = !['onTheWay', 'compass', 'radar'].includes(moment) || quest.trigger === 'none';
  return questView(
    quest,
    {
      unlockedAt: arrived ? now : null,
      pausedMsAtUnlock: 0,
      // Partway, so the progress bar shows
      walkedMeters: Math.round((quest.distanceMeters ?? 0) * 0.4),
    },
    moment === 'hint' ? 1 : 0,
  );
}
