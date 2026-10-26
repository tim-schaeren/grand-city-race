import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { consoleCopy as cc, copy, paths, type ChatMessage } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import type { HostTeam } from '../data/teams';
import { sendPushToTeam } from '../utils/push';

// By the game's own clock
function formatTime(ts: number, zone: string) {
  return new Date(ts).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: zone });
}

// One team's thread with the hosts, and the reply box. Showing it marks it
// read for every host.
export function ChatThread({ gameId, team, messages, zone }: {
  gameId: string;
  team: HostTeam;
  messages: ChatMessage[];
  zone: string;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastFromHost = messages.findLast(m => m.fromHost);
  const lastFromTeam = messages.findLast(m => !m.fromHost);
  const newest = messages.length ? messages[messages.length - 1].sentAt : 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [team.id, messages.length]);

  useEffect(() => {
    if (!newest || (team.hostChatReadAt ?? 0) >= newest) return;
    updateDoc(doc(db, paths.teamState(gameId, team.id)), { hostChatReadAt: newest }).catch(() => {});
  }, [gameId, team.id, team.hostChatReadAt, newest]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, paths.messages(gameId)), {
        teamId: team.id,
        authorId: user?.uid ?? '',
        // Players can read this record, so never the host's email address
        authorName: copy.chat.hosts,
        fromHost: true,
        text,
        sentAt: Date.now(),
      });
      setDraft('');
      await sendPushToTeam(gameId, team.id, copy.hostPush.chatReply, text);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5">
        {messages.length === 0 && <p className="text-sm text-gray-400">{cc.chatPage.nothingYetSayHello}</p>}
        {messages.map(m => {
          // "Seen" belongs on the last message of each side only
          const seen = m.fromHost
            ? m.id === lastFromHost?.id && (team.teamChatReadAt ?? 0) >= m.sentAt
            : m.id === lastFromTeam?.id && (team.hostChatReadAt ?? 0) >= m.sentAt;
          return (
            <div key={m.id} className={`flex flex-col ${m.fromHost ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 md:max-w-[75%] ${m.fromHost ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
                <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                <p className="mt-1 text-[10px] text-gray-400">
                  {m.fromHost ? '' : `${m.authorName} · `}
                  {formatTime(m.sentAt, zone)}
                </p>
              </div>
              {seen && <p className="mt-0.5 text-[10px] text-gray-400">{cc.chatPage.seen}</p>}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-gray-200 p-3">
        <input
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 md:text-sm"
          value={draft}
          maxLength={1000}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={cc.chatPage.replyTo({ openTeamName: team.name })}
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
        >
          {sending ? cc.chatPage.sending : cc.chatPage.send}
        </button>
      </div>
    </>
  );
}
