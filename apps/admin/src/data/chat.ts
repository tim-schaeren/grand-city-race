import { useMemo } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { paths, type ChatMessage } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useLiveQuery, type Live } from './live';
import { useTeams, type HostTeam } from './teams';

// Every team's thread with the hosts, oldest first
export function useMessages(gameId: string | undefined): Live<ChatMessage[]> {
  return useLiveQuery(
    gameId ? `messages:${gameId}` : null,
    () => query(collection(db, paths.messages(gameId!)), orderBy('sentAt', 'asc')),
    (id, data) => ({ id, ...data }) as ChatMessage,
  );
}

// A team's messages the hosts haven't read yet
export function unreadFrom(team: Pick<HostTeam, 'id' | 'hostChatReadAt'>, messages: ChatMessage[]): number {
  const readAt = team.hostChatReadAt ?? 0;
  return messages.filter(m => m.teamId === team.id && !m.fromHost && m.sentAt > readAt).length;
}

// Team messages the hosts haven't read yet, across the game
export function useChatUnread(gameId: string | undefined): number {
  const teams = useTeams(gameId);
  const messages = useMessages(gameId);
  return useMemo(() => {
    if (teams.status !== 'ready' || messages.status !== 'ready') return 0;
    return teams.data.reduce((sum, team) => sum + unreadFrom(team, messages.data), 0);
  }, [teams, messages]);
}
