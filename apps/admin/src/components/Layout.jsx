import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useMatch, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { generateJoinCode } from '@grandcityrace/shared';
import { useAuth } from '../hooks/useAuth';
import GameForm from './GameForm';
import Icon from './Icon';

export default function Layout() {
  const { user, isAdmin } = useAuth();
  const [games, setGames] = useState([]);
  const [persistedGameId, setPersistedGameId] = useState(
    () => localStorage.getItem('lastGameId')
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [saving, setSaving] = useState(false);
  const switcherRef = useRef(null);
  const hasAutoSelected = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const match = useMatch('/games/:gameId/*');
  const gameId = match?.params?.gameId;
  const section = match?.params?.['*'];

  const activeGameId = gameId ?? persistedGameId;
  const currentGame = games.find(g => g.id === activeGameId);

  // Admins see every game; hosts see only the games they run
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'games'), snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(g => isAdmin || (g.hostIds ?? []).includes(user.uid));
      list.sort((a, b) => a.startDateTime - b.startDateTime);
      setGames(list);
    });
  }, [user?.uid, isAdmin]);

  // Unread team messages across the active game, for the sidebar badge
  useEffect(() => {
    if (!activeGameId) return setChatUnread(0);
    let teams = [];
    let messages = [];
    const recount = () => {
      const readBy = Object.fromEntries(teams.map(t => [t.id, t.hostChatReadAt ?? 0]));
      setChatUnread(messages.filter(m => !m.fromHost && m.sentAt > (readBy[m.teamId] ?? 0)).length);
    };
    const unsubTeams = onSnapshot(
      query(collection(db, 'teams'), where('gameId', '==', activeGameId)),
      snap => { teams = snap.docs.map(d => ({ id: d.id, ...d.data() })); recount(); },
    );
    const unsubMessages = onSnapshot(
      query(collection(db, 'games', activeGameId, 'messages'), orderBy('sentAt', 'asc')),
      snap => { messages = snap.docs.map(d => d.data()); recount(); },
      () => setChatUnread(0),
    );
    return () => { unsubTeams(); unsubMessages(); };
  }, [activeGameId]);

  useEffect(() => {
    if (hasAutoSelected.current || gameId || games.length === 0) return;
    hasAutoSelected.current = true;
    const lastId = localStorage.getItem('lastGameId');
    const target = games.find(g => g.id === lastId) ?? games[0];
    navigate(`/games/${target.id}/quests`, { replace: true });
  }, [games]);

  useEffect(() => {
    if (gameId && gameId !== persistedGameId) {
      setPersistedGameId(gameId);
      localStorage.setItem('lastGameId', gameId);
    }
  }, [gameId]);

  // Close switcher on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Close both menus on navigation
  useEffect(() => {
    setSwitcherOpen(false);
    setSidebarOpen(false);
  }, [location.pathname]);

  function switchGame(game) {
    const gameSections = ['game', 'quests', 'teams', 'items', 'leaderboard', 'live-map', 'activity', 'chat'];
    const target = gameSections.includes(section) ? section : 'quests';
    navigate(`/games/${game.id}/${target}`);
  }

  async function handleSaveGame(data) {
    setSaving(true);
    try {
      if (editingGame === 'new') {
        // Whoever creates a game hosts it, and it needs a code for players to join with
        const ref = await addDoc(collection(db, 'games'), {
          ...data,
          hostIds: [user.uid],
          joinCode: generateJoinCode(),
        });
        navigate(`/games/${ref.id}/quests`);
      } else {
        await updateDoc(doc(db, 'games', editingGame.id), data);
      }
      setEditingGame(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGame() {
    if (!editingGame || editingGame === 'new') return;
    await deleteDoc(doc(db, 'games', editingGame.id));
    if (editingGame.id === gameId) navigate('/users');
    setEditingGame(null);
  }

  const navClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  const sidebarContent = (
    <>
      {/* Game switcher */}
      <div ref={switcherRef} className="relative px-3 py-3 border-b border-gray-100">
        <button
          onClick={() => setSwitcherOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <p className="font-semibold text-gray-900 truncate">
            {currentGame?.name ?? cc.layout.selectGame}
          </p>
          <span className="text-gray-400 text-[10px] ml-2 shrink-0">
            {switcherOpen ? '▲' : '▼'}
          </span>
        </button>

        {switcherOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            {games.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">{cc.layout.noGamesYet}</p>
            )}
            {games.map(game => (
              <div key={game.id} className="flex items-center group">
                <button
                  onClick={() => switchGame(game)}
                  className={`flex-1 text-left px-3 py-2 text-sm transition-colors truncate ${
                    game.id === activeGameId
                      ? 'font-medium text-gray-900 bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {game.name}
                </button>
                <button
                  onClick={() => { setEditingGame(game); setSwitcherOpen(false); }}
                  className="px-2 py-2 text-xs text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title={cc.layout.editGame}
                >
                  <Icon name="pencil-outline" size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => { setEditingGame('new'); setSwitcherOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              {cc.layout.newGame}
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {activeGameId && (
          <>
            <NavLink to={`/games/${activeGameId}/game`} className={navClass}>{cc.layout.game}</NavLink>
            <NavLink to={`/games/${activeGameId}/quests`} className={navClass}>{cc.layout.quests}</NavLink>
            <NavLink to={`/games/${activeGameId}/teams`} className={navClass}>{cc.layout.teams}</NavLink>
            <NavLink to={`/games/${activeGameId}/items`} className={navClass}>{cc.layout.items}</NavLink>
            <NavLink to={`/games/${activeGameId}/leaderboard`} className={navClass}>{cc.layout.leaderboard}</NavLink>
            <NavLink to={`/games/${activeGameId}/live-map`} className={navClass}>{cc.layout.liveMap}</NavLink>
            <NavLink to={`/games/${activeGameId}/activity`} className={navClass}>{cc.layout.activity}</NavLink>
            <NavLink to={`/games/${activeGameId}/chat`} className={navClass}>
              <span className="flex items-center gap-2">
                {rich(cc.layout.chat({ chatUnread: chatUnread > 0 && (
                  <span className="text-xs font-semibold text-white bg-red-500 rounded-full px-1.5 py-0.5">{chatUnread}</span>
                ) }))}
              </span>
            </NavLink>
            <div className="pt-2 mt-2 border-t border-gray-100" />
          </>
        )}
        {isAdmin && <NavLink to="/users" className={navClass}>{cc.layout.users}</NavLink>}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <a
          href="/help/hosting"
          target="_blank"
          rel="noreferrer"
          className="block w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {cc.layout.hostingGuide}
        </a>
        <button
          onClick={() => signOut(auth)}
          className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {cc.layout.signOut}
        </button>
      </div>
    </>
  );

  return (
    // The visible height, not the screen's: on phones the screen runs on
    // under the browser's toolbar
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — slide-in on mobile, always visible on desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:w-52 md:translate-x-0 md:z-auto
      `}>
        {sidebarContent}
      </aside>

      {/* Content area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-14 px-4 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 font-semibold text-gray-900 truncate">
            {currentGame?.name ?? cc.layout.gcrAdmin}
          </span>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex">
          <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            {games.length === 0 ? (
              // First run: a new host has nowhere to go until a game exists
              <div className="max-w-md mx-auto mt-16 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {cc.layout.welcomeToGrandCityRace}
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                  {cc.layout.createAGameAddSome}
                </p>
                <button
                  onClick={() => setEditingGame('new')}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  {cc.layout.createYourFirstGame}
                </button>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>

      {/* GameForm overlay */}
      {editingGame !== null && (
        <>
          <div
            className="fixed inset-0 z-[1001] bg-black/20"
            onClick={() => setEditingGame(null)}
          />
          <div className="fixed right-0 inset-y-0 z-[1002] w-full md:w-96 bg-white shadow-xl flex flex-col">
            <GameForm
              game={editingGame === 'new' ? null : editingGame}
              onSave={handleSaveGame}
              onCancel={() => setEditingGame(null)}
              onDelete={handleDeleteGame}
              saving={saving}
            />
          </div>
        </>
      )}
    </div>
  );
}
