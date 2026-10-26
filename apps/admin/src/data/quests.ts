import { collection } from 'firebase/firestore';
import { normalizeQuest, paths, type Quest } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';

// A game's quests, in no particular order; see inOrder
export function useQuests(gameId: string | undefined): Live<Quest[]> {
  return useLiveQuery(
    gameId ? `quests:${gameId}` : null,
    () => collection(db, paths.quests(gameId!)),
    (id, data) => normalizeQuest(id, data),
  );
}

// The quests in the order teams play them, each with its number
export function inOrder(quests: Quest[], order: string[] | undefined): (Quest & { number: number })[] {
  const byId = new Map(quests.map(q => [q.id, q]));
  return (order ?? []).flatMap((id, i) => {
    const quest = byId.get(id);
    return quest ? [{ ...quest, number: i + 1 }] : [];
  });
}
