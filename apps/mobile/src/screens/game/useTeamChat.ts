import { useState, useEffect } from 'react';
import { doc, collection, query, where, orderBy, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage, Team } from '@grandcityrace/shared';
import { db } from '../../firebase';
import { listen } from '../../utils/listen';

// This team's thread with the hosts, and how many of the hosts' messages
// are unread. `reading` is true while the chat is open in front of the player.
export function useTeamChat(
	gameId: string | undefined,
	team: Team | null,
	reading: boolean,
) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [seenAt, setSeenAt] = useState(0);

	useEffect(() => {
		if (!gameId || !team?.id) return;
		return listen(
			query(
				collection(db, 'games', gameId, 'messages'),
				where('teamId', '==', team.id),
				orderBy('sentAt', 'asc'),
			),
			(snap) =>
				setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)),
		);
	}, [gameId, team?.id]);

	useEffect(() => {
		if (!gameId) return;
		AsyncStorage.getItem(`chatSeen:${gameId}`)
			.then((v) => setSeenAt(v ? Number(v) : 0))
			.catch(() => {});
	}, [gameId]);

	// Only the hosts' messages are news; your teammates' are not
	const unread = messages.filter((m) => m.fromHost && m.sentAt > seenAt).length;

	useEffect(() => {
		if (!reading || !gameId || !messages.length) return;
		const newest = messages[messages.length - 1].sentAt;
		if (newest > seenAt) {
			setSeenAt(newest);
			AsyncStorage.setItem(`chatSeen:${gameId}`, String(newest)).catch(() => {});
		}
		// Shared marker, so the hosts can see their message was read
		if (team && (team.teamChatReadAt ?? 0) < newest) {
			updateDoc(doc(db, 'teams', team.id), { teamChatReadAt: newest }).catch(() => {});
		}
	}, [reading, messages, seenAt, gameId, team?.id, team?.teamChatReadAt]);

	return { messages, unread };
}
