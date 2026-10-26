import { useSyncExternalStore } from 'react';

// Light, dark, or whatever the system uses. Only this browser needs to know,
// so it's kept here; index.html applies it before the page draws, and
// theme.css does the rest.
export type Appearance = 'system' | 'light' | 'dark';

const KEY = 'gcr-appearance';
const listeners = new Set<() => void>();

function read(): Appearance {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function setAppearance(appearance: Appearance) {
  try {
    if (appearance === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, appearance);
  } catch {
    // Without storage the choice lasts until the page reloads
  }
  if (appearance === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = appearance;
  listeners.forEach(l => l());
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
  );
}
