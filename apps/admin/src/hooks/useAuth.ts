import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

const DEAD_SESSION_CODES = ['auth/user-not-found', 'auth/user-token-expired', 'auth/user-disabled', 'auth/invalid-user-token'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hostedGameIds, setHostedGameIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setHostedGameIds([]);
        setLoading(false);
        return;
      }

      // A session restored from the browser can belong to an account that no
      // longer exists. Refreshing its token is what finds out, and the only
      // way back from that is signing out.
      try {
        await firebaseUser.getIdToken();
      } catch (e) {
        if (DEAD_SESSION_CODES.includes((e as { code?: string })?.code ?? '')) {
          await signOut(auth).catch(() => {});
          return;
        }
      }

      setUser(firebaseUser);
      // Platform admins carry a claim on their sign-in, set by the server
      try {
        const token = await firebaseUser.getIdTokenResult();
        setIsAdmin(token.claims.admin === true);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  // Games this user hosts. Platform admins can run every game, so they don't
  // need to be listed as a host to get in.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'games'), where('hostIds', 'array-contains', user.uid)),
      snap => setHostedGameIds(snap.docs.map(d => d.id)),
      () => setHostedGameIds([]),
    );
  }, [user?.uid]);

  return { user, isAdmin, hostedGameIds, isHost: hostedGameIds.length > 0, loading };
}
