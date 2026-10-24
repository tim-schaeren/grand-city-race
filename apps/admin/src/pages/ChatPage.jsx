import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
	collection,
	doc,
	addDoc,
	onSnapshot,
	orderBy,
	query,
	where,
	updateDoc,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { copy } from '@grandcityrace/shared';
import { db, auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { sendPushToTeam } from '../utils/push';

function formatTime(ts) {
	return new Date(ts).toLocaleString([], {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function ChatPage() {
	const { gameId } = useParams();
	const { user } = useAuth();
	const [teams, setTeams] = useState([]);
	const [messages, setMessages] = useState([]);
	const [openTeamId, setOpenTeamId] = useState(null);
	const [draft, setDraft] = useState('');
	const [sending, setSending] = useState(false);
	const [notifyOn, setNotifyOn] = useState(
		() =>
			typeof Notification !== 'undefined' &&
			Notification.permission === 'granted',
	);
	const seenRef = useRef(null);
	const bottomRef = useRef(null);

	useEffect(() => {
		return onSnapshot(
			query(collection(db, 'teams'), where('gameId', '==', gameId)),
			(snap) => setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
		);
	}, [gameId]);

	useEffect(() => {
		return onSnapshot(
			query(
				collection(db, 'games', gameId, 'messages'),
				orderBy('sentAt', 'asc'),
			),
			(snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
		);
	}, [gameId]);

	const byTeam = useMemo(() => {
		const map = {};
		for (const m of messages) (map[m.teamId] ??= []).push(m);
		return map;
	}, [messages]);

	// Desktop notification for messages from teams, so a host doesn't have to watch the tab
	useEffect(() => {
		const fromTeams = messages.filter((m) => !m.fromHost);
		const newest = fromTeams.length ? fromTeams[fromTeams.length - 1] : null;
		if (!newest) return;
		if (seenRef.current === null) {
			seenRef.current = newest.sentAt;
			return;
		} // don't announce history on load
		if (newest.sentAt <= seenRef.current) return;
		seenRef.current = newest.sentAt;
		if (
			typeof Notification !== 'undefined' &&
			Notification.permission === 'granted' &&
			document.visibilityState !== 'visible'
		) {
			const team = teams.find((t) => t.id === newest.teamId);
			new Notification(`${team?.name ?? cc.chatPage.aTeam} wrote`, {
				body: newest.text,
			});
		}
	}, [messages, teams]);

	const openTeam = teams.find((t) => t.id === openTeamId) ?? null;
	const thread = openTeamId ? (byTeam[openTeamId] ?? []) : [];
	const lastFromHost = [...thread].reverse().find((m) => m.fromHost);
	const lastFromTeam = [...thread].reverse().find((m) => !m.fromHost);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: 'end' });
	}, [openTeamId, thread.length]);

	// Opening a thread marks it read for every host
	useEffect(() => {
		if (!openTeam || !thread.length) return;
		const newest = thread[thread.length - 1].sentAt;
		if ((openTeam.hostChatReadAt ?? 0) >= newest) return;
		updateDoc(doc(db, 'teams', openTeam.id), { hostChatReadAt: newest }).catch(
			() => {},
		);
	}, [openTeam?.id, thread.length]);

	const unreadFor = (team) => {
		const msgs = byTeam[team.id] ?? [];
		const readAt = team.hostChatReadAt ?? 0;
		return msgs.filter((m) => !m.fromHost && m.sentAt > readAt).length;
	};

	async function send() {
		const text = draft.trim();
		if (!text || !openTeam || sending) return;
		setSending(true);
		try {
			await addDoc(collection(db, 'games', gameId, 'messages'), {
				teamId: openTeam.id,
				authorId: user?.uid ?? '',
				// Players can read this record, so never the host's email address
				authorName: copy.chat.hosts,
				fromHost: true,
				text,
				sentAt: Date.now(),
			});
			setDraft('');
			await sendPushToTeam(gameId, openTeam.id, copy.hostPush.chatReply, text);
		} finally {
			setSending(false);
		}
	}

	async function enableNotifications() {
		if (typeof Notification === 'undefined') return;
		const permission = await Notification.requestPermission();
		setNotifyOn(permission === 'granted');
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-900">{cc.chatPage.chat}</h1>
				{!notifyOn && typeof Notification !== 'undefined' && (
					<button
						onClick={enableNotifications}
						className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
					>
						{cc.chatPage.enableDesktopNotifications}
					</button>
				)}
			</div>

			{/* Side by side on a computer; on a phone the list or one thread at a
			    time, and the visible height so the reply box stays above the
			    browser's toolbar */}
			<div className="flex gap-6 h-[calc(100dvh-9.5rem)] md:h-[calc(100dvh-12rem)]">
				<div className={`w-full md:w-64 shrink-0 overflow-y-auto space-y-1 ${openTeam ? 'hidden md:block' : ''}`}>
					{teams.length === 0 && (
						<p className="text-gray-400 text-sm">{cc.chatPage.noTeamsYet}</p>
					)}
					{teams.map((team) => {
						const unread = unreadFor(team);
						const msgs = byTeam[team.id] ?? [];
						const last = msgs[msgs.length - 1];
						return (
							<button
								key={team.id}
								onClick={() => setOpenTeamId(team.id)}
								className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
									openTeamId === team.id
										? 'border-gray-900 bg-white'
										: 'border-gray-200 bg-white hover:border-gray-400'
								}`}
							>
								<div className="flex items-center gap-2">
									<span className="flex-1 text-sm font-medium text-gray-900 truncate">
										{team.name}
									</span>
									{unread > 0 && (
										<span className="text-xs font-semibold text-white bg-red-500 rounded-full px-1.5 py-0.5">
											{unread}
										</span>
									)}
								</div>
								<p className="text-xs text-gray-400 truncate mt-0.5">
									{last
										? `${last.fromHost ? cc.chatPage.you : ''}${last.text}`
										: cc.chatPage.noMessagesYet}
								</p>
							</button>
						);
					})}
				</div>

				<div className={`flex-1 min-w-0 bg-white border border-gray-200 rounded-lg flex-col ${openTeam ? 'flex' : 'hidden md:flex'}`}>
					{!openTeam ? (
						<div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
							{cc.chatPage.pickATeamToRead}
						</div>
					) : (
						<>
							<div className="px-4 md:px-5 py-3 border-b border-gray-200 flex items-center gap-3">
								<button
									onClick={() => setOpenTeamId(null)}
									className="md:hidden text-sm text-gray-500 hover:text-gray-900 shrink-0"
								>
									{cc.chatPage.allTeams}
								</button>
								<p className="text-sm font-semibold text-gray-900 truncate">
									{openTeam.name}
								</p>
							</div>
							<div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-3">
								{thread.length === 0 && (
									<p className="text-sm text-gray-400">
										{cc.chatPage.nothingYetSayHello}
									</p>
								)}
								{thread.map((m) => {
									// "Seen" belongs on the last message of each side only
									const seen = m.fromHost
										? m.id === lastFromHost?.id &&
											(openTeam.teamChatReadAt ?? 0) >= m.sentAt
										: m.id === lastFromTeam?.id &&
											(openTeam.hostChatReadAt ?? 0) >= m.sentAt;
									return (
										<div
											key={m.id}
											className={`flex flex-col ${m.fromHost ? 'items-end' : 'items-start'}`}
										>
											<div
												className={`max-w-[85%] md:max-w-[75%] rounded-xl px-3 py-2 ${m.fromHost ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}
											>
												<p className="text-sm whitespace-pre-wrap break-words">
													{m.text}
												</p>
												<p className="text-[10px] mt-1 text-gray-400">
													{m.fromHost ? '' : `${m.authorName} · `}
													{formatTime(m.sentAt)}
												</p>
											</div>
											{seen && (
												<p className="text-[10px] text-gray-400 mt-0.5">{cc.chatPage.seen}</p>
											)}
										</div>
									);
								})}
								<div ref={bottomRef} />
							</div>
							<div className="border-t border-gray-200 p-3 flex gap-2">
								<input
									className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
									value={draft}
									onChange={(e) => setDraft(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && send()}
									placeholder={cc.chatPage.replyTo({ openTeamName: openTeam.name })}
								/>
								<button
									onClick={send}
									disabled={!draft.trim() || sending}
									className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
								>
									{sending ? cc.chatPage.sending : cc.chatPage.send}
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
