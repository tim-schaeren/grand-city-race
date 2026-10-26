import { useEffect, useState } from 'react';
import { doc, onSnapshot, type DocumentData, type Query } from 'firebase/firestore';
import { db } from '../firebase';

// Something read live from the database: still on its way, failed, or here.
// A page says "nothing yet" only once it knows, never while it's loading.
export type Live<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: T };

export const loading = { status: 'loading' } as const;

export function isReady<T>(live: Live<T>): live is { status: 'ready'; data: T } {
  return live.status === 'ready';
}

// The data once it's here, or a fallback until then
export function dataOr<T, F>(live: Live<T>, fallback: F): T | F {
  return live.status === 'ready' ? live.data : fallback;
}

// One document, or null when it doesn't exist. No path, nothing to read.
export function useLiveDoc<T>(
  path: string | null,
  read: (id: string, data: DocumentData) => T,
): Live<T | null> {
  const [live, setLive] = useState<Live<T | null>>(loading);
  useEffect(() => {
    if (!path) return;
    setLive(loading);
    return onSnapshot(
      doc(db, path),
      snap => setLive({ status: 'ready', data: snap.exists() ? read(snap.id, snap.data()) : null }),
      error => setLive({ status: 'error', error }),
    );
    // `read` is a plain mapping; a new one each render needn't restart the listener
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return path ? live : { status: 'ready', data: null };
}

// A list. `key` names the query, so the listener starts again when it changes.
// `read` also gets each document's path, for lists that span games.
export function useLiveQuery<T>(
  key: string | null,
  query: () => Query,
  read: (id: string, data: DocumentData, path: string) => T,
): Live<T[]> {
  const [live, setLive] = useState<Live<T[]>>(loading);
  useEffect(() => {
    if (!key) return;
    setLive(loading);
    return onSnapshot(
      query(),
      snap => setLive({ status: 'ready', data: snap.docs.map(d => read(d.id, d.data(), d.ref.path)) }),
      error => setLive({ status: 'error', error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return key ? live : { status: 'ready', data: [] };
}
