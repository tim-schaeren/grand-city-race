import { useSyncExternalStore } from 'react';

// Guided mode: the checklist one step at a time, in a bar above every page.
// Only this host needs to know they're following it, so it's kept in the
// browser, per game: off, or the step they're on.

const key = (gameId: string) => `gcr-guide:${gameId}`;
const listeners = new Set<() => void>();

function read(gameId: string): number | null {
  try {
    const value = localStorage.getItem(key(gameId));
    return value === null ? null : Number(value) || 0;
  } catch {
    return null;
  }
}

export function setGuideStep(gameId: string, step: number | null) {
  try {
    if (step === null) localStorage.removeItem(key(gameId));
    else localStorage.setItem(key(gameId), String(step));
  } catch {
    // Without storage the guide simply doesn't stay on
  }
  listeners.forEach(l => l());
}

// The step the host is on, or null when the guide is off
export function useGuideStep(gameId: string | undefined): number | null {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (gameId ? read(gameId) : null),
  );
}
