import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ConsoleLayout from './shell/ConsoleLayout';
import GamesHome from './shell/GamesHome';
import { GameEntry } from './shell/GameEntry';
import NewGamePage from './settings/NewGamePage';
import SettingsPage from './settings/SettingsPage';
import { RecapRoute } from './shell/RecapRoute';
import QuestChain from './quests/QuestChain';
import TeamsPage from './teams/TeamsPage';
import UsersPage from './users/UsersPage';
import RaceControl from './race/RaceControl';
import FeedPage from './race/FeedPage';
import ChatPage from './pages/ChatPage';
import TeamPage from './entities/TeamPage';
import QuestPage from './quests/QuestPage';
import ItemPage from './entities/ItemPage';
import PlayerPage from './entities/PlayerPage';
import ShopPage from './shop/ShopPage';
import LiveMap from './race/map/LiveMap';
import Overview from './prepare/Overview';
import TestRun from './prepare/TestRun';
import ResultsPage from './after/ResultsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import GuidelinesPage from './pages/legal/GuidelinesPage';
import SupportPage from './pages/legal/SupportPage';
import PlayerHelpPage from './pages/help/PlayerHelpPage';
import HostHelpPage from './pages/help/HostHelpPage';
import RecapPage from './pages/RecapPage';
import { to } from './shell/to';
import { EntitySheet } from './shell/EntitySheet';
import type { SheetState } from './shell/sheet';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

// Addresses from before the three phases, so old links and bookmarks still land
const OLD_PAGES: Record<string, (gameId: string) => string> = {
  game: to.overview,
  quests: to.quests,
  teams: to.teams,
  items: to.shop,
  leaderboard: to.controls,
  'live-map': to.map,
  activity: to.feed,
  chat: to.chat,
};

// A phase's own address opens its first page; an old address, its new one
function ToGamePage({ page }: { page: (gameId: string) => string }) {
  const { gameId } = useParams();
  return <Navigate replace to={page(gameId!)} />;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return null;
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  // A page opened in a sheet over race control: race control stays drawn behind it
  const background = (location.state as SheetState)?.background;

  return (
    <>
      <Routes location={background ?? location}>
        {/* Public: the stores require a reachable privacy policy */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/guidelines" element={<GuidelinesPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/help" element={<PlayerHelpPage />} />
        <Route path="/help/hosting" element={<HostHelpPage />} />
        {/* Full screen, outside the console: hosts open it, and the app shows it to players */}
        <Route path="/recap/:gameId" element={<RecapPage />} />
        <Route
          path="/login"
          element={user ? <Navigate to={to.games()} replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ConsoleLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={to.games()} replace />} />
          <Route path="games" element={<GamesHome />} />
          <Route path="games/new" element={<NewGamePage />} />
          <Route path="games/:gameId" element={<GameEntry />} />

          <Route path="games/:gameId/prepare" element={<ToGamePage page={to.overview} />} />
          <Route path="games/:gameId/prepare/overview" element={<Overview />} />
          <Route path="games/:gameId/prepare/quests" element={<QuestChain />} />
          <Route path="games/:gameId/prepare/shop" element={<ShopPage />} />
          <Route path="games/:gameId/prepare/teams" element={<TeamsPage />} />
          <Route path="games/:gameId/prepare/test" element={<TestRun />} />
          <Route path="games/:gameId/prepare/settings" element={<SettingsPage />} />

          <Route path="games/:gameId/race" element={<ToGamePage page={to.controls} />} />
          <Route path="games/:gameId/race/controls" element={<RaceControl />} />
          <Route path="games/:gameId/race/map" element={<LiveMap />} />
          <Route path="games/:gameId/race/feed" element={<FeedPage />} />
          <Route path="games/:gameId/race/chat" element={<ChatPage />} />

          <Route path="games/:gameId/teams/:teamId" element={<TeamPage />} />
          <Route path="games/:gameId/quests/:questId" element={<QuestPage />} />
          <Route path="games/:gameId/shop/:item" element={<ItemPage />} />
          <Route path="games/:gameId/players/:uid" element={<PlayerPage />} />

          <Route path="games/:gameId/after" element={<ToGamePage page={to.results} />} />
          <Route path="games/:gameId/after/results" element={<ResultsPage />} />
          <Route path="games/:gameId/after/recap" element={<RecapRoute />} />

          {Object.keys(OLD_PAGES).map(page => (
            <Route key={page} path={`games/:gameId/${page}`} element={<ToGamePage page={OLD_PAGES[page]} />} />
          ))}

          <Route path="users" element={<UsersPage />} />
          {/* The page was called Players before; old links still arrive */}
          <Route path="players" element={<Navigate to={to.users()} replace />} />
        </Route>
      </Routes>
      {background && (
        <Routes>
          <Route path="/games/:gameId/teams/:teamId" element={<EntitySheet background={background}><TeamPage /></EntitySheet>} />
          <Route path="/games/:gameId/quests/:questId" element={<EntitySheet background={background}><QuestPage /></EntitySheet>} />
          <Route path="/games/:gameId/shop/:item" element={<EntitySheet background={background}><ItemPage /></EntitySheet>} />
          <Route path="/games/:gameId/players/:uid" element={<EntitySheet background={background}><PlayerPage /></EntitySheet>} />
          <Route path="*" element={null} />
        </Routes>
      )}
    </>
  );
}
