import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import QuestsPage from './pages/QuestsPage';
import TeamsPage from './pages/TeamsPage';
import UsersPage from './pages/UsersPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ActivityPage from './pages/ActivityPage';
import ChatPage from './pages/ChatPage';
import ItemsPage from './pages/ItemsPage';
import LiveMapPage from './pages/LiveMapPage';
import GamePage from './pages/GamePage';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import GuidelinesPage from './pages/legal/GuidelinesPage';
import SupportPage from './pages/legal/SupportPage';
import PlayerHelpPage from './pages/help/PlayerHelpPage';
import HostHelpPage from './pages/help/HostHelpPage';
import RecapPage from './pages/RecapPage';

function ProtectedRoute({ children }) {
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

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
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
          element={user ? <Navigate to="/games" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/users" replace />} />
          <Route path="games" element={<Navigate to="/users" replace />} />
          <Route path="games/:gameId/quests" element={<QuestsPage />} />
          <Route path="games/:gameId/teams" element={<TeamsPage />} />
          <Route path="games/:gameId/items" element={<ItemsPage />} />
          <Route path="games/:gameId/leaderboard" element={<LeaderboardPage />} />
          <Route path="games/:gameId/activity" element={<ActivityPage />} />
          <Route path="games/:gameId/chat" element={<ChatPage />} />
          <Route path="games/:gameId/live-map" element={<LiveMapPage />} />
          <Route path="games/:gameId/game" element={<GamePage />} />
          <Route path="users" element={<UsersPage />} />
          {/* The page was called Players before; old links still arrive */}
          <Route path="players" element={<Navigate to="/users" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
