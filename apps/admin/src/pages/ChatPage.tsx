import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { consoleCopy as cc, type ChatMessage } from '@grandcityrace/shared';
import { ChatThread } from '../chat/ChatThread';
import { useGame } from '../data/games';
import { dataOr } from '../data/live';
import { unreadFrom, useMessages } from '../data/chat';
import { useTeams } from '../data/teams';
import { TeamLink } from '../ui/EntityLink';
import { Show } from '../ui/States';
import { gameTimeZone } from '../utils/zonedTime';

export default function ChatPage() {
  const { gameId } = useParams();
  const [search, setSearch] = useSearchParams();
  const teamsLive = useTeams(gameId);
  const teams = dataOr(teamsLive, []);
  const messages = dataOr(useMessages(gameId), [] as ChatMessage[]);
  const zone = gameTimeZone(dataOr(useGame(gameId), null));
  // The open thread is in the address, so a team's page can link straight to it
  const openTeamId = search.get('team');
  const openTeam = teams.find(t => t.id === openTeamId) ?? null;
  const setOpen = (teamId: string | null) => setSearch(teamId ? { team: teamId } : {}, { replace: true });
  const [notifyOn, setNotifyOn] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );
  const seenRef = useRef<number | null>(null);

  const byTeam = useMemo(() => {
    const map: Record<string, ChatMessage[]> = {};
    for (const m of messages) (map[m.teamId] ??= []).push(m);
    return map;
  }, [messages]);

  // Desktop notification for messages from teams, so a host doesn't have to watch the tab
  useEffect(() => {
    const newest = messages.findLast(m => !m.fromHost);
    if (!newest) return;
    if (seenRef.current === null) {
      // Don't announce history on load
      seenRef.current = newest.sentAt;
      return;
    }
    if (newest.sentAt <= seenRef.current) return;
    seenRef.current = newest.sentAt;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      const team = teams.find(t => t.id === newest.teamId);
      new Notification(`${team?.name ?? cc.chatPage.aTeam} wrote`, { body: newest.text });
    }
  }, [messages, teams]);

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    setNotifyOn((await Notification.requestPermission()) === 'granted');
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{cc.chatPage.chat}</h1>
        {!notifyOn && typeof Notification !== 'undefined' && (
          <button onClick={enableNotifications} className="text-xs text-gray-400 transition-colors hover:text-gray-700">
            {cc.chatPage.enableDesktopNotifications}
          </button>
        )}
      </div>

      {/* Side by side on a computer; on a phone the list or one thread at a
          time, and the visible height so the reply box stays above the
          browser's toolbar */}
      <Show live={teamsLive}>
        {() => (
          <div className="flex h-[calc(100dvh-14rem)] gap-6 md:h-[calc(100dvh-17rem)]">
            <div className={`w-full shrink-0 space-y-1 overflow-y-auto md:w-64 ${openTeam ? 'hidden md:block' : ''}`}>
              {teams.length === 0 && <p className="text-sm text-gray-400">{cc.chatPage.noTeamsYet}</p>}
              {teams.map(team => {
                const unread = unreadFrom(team, messages);
                const thread = byTeam[team.id] ?? [];
                const last = thread[thread.length - 1];
                return (
                  <button
                    key={team.id}
                    onClick={() => setOpen(team.id)}
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-left transition-colors ${
                      openTeamId === team.id ? 'border-gray-900' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm font-medium text-gray-900">{team.name}</span>
                      {unread > 0 && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">{unread}</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {last ? `${last.fromHost ? cc.chatPage.you : ''}${last.text}` : cc.chatPage.noMessagesYet}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className={`min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white ${openTeam ? 'flex' : 'hidden md:flex'}`}>
              {!openTeam ? (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-400">{cc.chatPage.pickATeamToRead}</div>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 md:px-5">
                    <button onClick={() => setOpen(null)} className="shrink-0 text-sm text-gray-500 hover:text-gray-900 md:hidden">
                      {cc.chatPage.allTeams}
                    </button>
                    <p className="truncate text-sm">
                      <TeamLink id={openTeam.id} name={openTeam.name} color={openTeam.color} />
                    </p>
                  </div>
                  <ChatThread gameId={gameId!} team={openTeam} messages={byTeam[openTeam.id] ?? []} zone={zone} />
                </>
              )}
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
