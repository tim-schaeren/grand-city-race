import { consoleCopy as cc, copy } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { recapRef } from '../utils/recap';
import Recap from '../recap/Recap';
import { to } from '../shell/to';

// The recap on its own page, full screen: hosts open it from the Game page,
// for a look or for a big screen. The app shows this same page to players,
// handing it the recap they may read, so then nothing is loaded here.
export default function RecapPage() {
  const { gameId } = useParams();
  const fromApp = window.__RECAP__;
  const { user, loading } = useAuth();
  const [recap, setRecap] = useState(undefined);
  const [themeId, setThemeId] = useState(undefined);

  useEffect(() => {
    if (fromApp || !user) return undefined;
    return onSnapshot(recapRef(gameId), snap => setRecap(snap.exists() ? snap.data() : null), () => setRecap(null));
  }, [gameId, user, fromApp]);
  useEffect(() => {
    if (fromApp || !user) return undefined;
    return onSnapshot(doc(db, 'games', gameId), snap => setThemeId(snap.data()?.themeId));
  }, [gameId, user, fromApp]);

  if (fromApp) {
    return (
      <Recap
        recap={fromApp.recap}
        themeId={fromApp.themeId}
        viewerTeamId={fromApp.viewerTeamId ?? null}
        onClose={() => window.ReactNativeWebView?.postMessage('close')}
      />
    );
  }
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (recap === undefined) {
    return <p className="min-h-screen flex items-center justify-center text-sm text-gray-400">{copy.recap.loading}</p>;
  }
  if (!recap) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-gray-500">
        <p>{cc.recapPage.noRecapYet}</p>
        <Link to={to.recap(gameId)} className="underline">{cc.recapPage.backToTheConsole}</Link>
      </div>
    );
  }
  return <Recap recap={recap} themeId={themeId} />;
}
