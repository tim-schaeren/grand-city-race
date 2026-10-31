import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { listen } from '../utils/listen';

export function useUser() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    return listen(
      doc(db, 'users', user.uid),
      snap => {
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [user?.uid]);

  return { profile, loading };
}
