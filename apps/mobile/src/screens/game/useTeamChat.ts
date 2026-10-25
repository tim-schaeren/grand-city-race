import { useState, useEffect } from 'react';
import { doc, collection, query, where, orderBy, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { paths, type ChatMessage, type TeamState } from '@grandcityrace/shared';
import { db } from '../../firebase';
import { listen } from '../../utils/listen';

// This team's thread with the hosts, and how many of the hosts' messages
// are unread. `reading` is true while the chat is open in front of the player.
export function useTeamChat(
	gameId: string,
	teamId: string,
	state: TeamState | null,
	reading: boolean,
) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [seenAt, setSeenAt] = useState(0);

	useEffect(() => {
		return listen(
			query(
				collection(db, paths.messages(gameId)),
				where('teamId', '==', teamId),
				orderBy('sentAt', 'asc'),
			),
			(snap) =>
				setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)),
		);
	}, [gameId, teamId]);

	useEffect(() => {
		AsyncStorage.getItem(`chatSeen:${gameId}`)
			.then((v) => setSeenAt(v ? Number(v) : 0))
			.catch(() => {});
	}, [gameId]);

	// Only the hosts' messages are news; your teammates' are not
	const unread = messages.filter((m) => m.fromHost && m.sentAt > seenAt).length;

	useEffect(() => {
		if (!reading || !messages.length) return;
		const newest = messages[messages.length - 1].sentAt;
		if (newest > seenAt) {
			setSeenAt(newest);
			AsyncStorage.setItem(`chatSeen:${gameId}`, String(newest)).catch(() => {});
		}
		// Shared marker, so the hosts can see their message was read
		if (state && (state.teamChatReadAt ?? 0) < newest) {
			updateDoc(doc(db, paths.teamState(gameId, teamId)), { teamChatReadAt: newest }).catch(() => {});
		}
	}, [reading, messages, seenAt, gameId, teamId, state?.teamChatReadAt]);

	return { messages, unread };
}
