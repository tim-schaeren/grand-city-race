import AsyncStorage from '@react-native-async-storage/async-storage';
import { metersBetween } from '@grandcityrace/shared';

// Accumulates distance travelled for the current "distance" quest on this device.
// Fed by both the foreground location watcher and the background location task,
// and persisted so progress survives app restarts.

const KEY = 'distanceTracker';
const MIN_STEP_METERS = 15;     // ignore GPS jitter while standing still
const MAX_ACCURACY_METERS = 40; // ignore low-quality fixes

export interface TrackerState {
  questId: string;
  meters: number;
  last: { lat: number; lng: number } | null;
}

// Serialize read-modify-write cycles so foreground and background updates don't clobber each other
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function read(): Promise<TrackerState | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as TrackerState) : null;
}

// Starts tracking a quest, or resumes it keeping whichever is further: local or team progress
export function startTracking(questId: string, teamMeters: number): Promise<TrackerState> {
  return serialized(async () => {
    const current = await read();
    const state: TrackerState =
      current?.questId === questId
        ? { ...current, meters: Math.max(current.meters, teamMeters) }
        : { questId, meters: teamMeters, last: null };
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
    return state;
  });
}

export function stopTracking(): Promise<void> {
  return serialized(() => AsyncStorage.removeItem(KEY));
}

export function recordPosition(lat: number, lng: number, accuracy?: number | null): Promise<TrackerState | null> {
  return serialized(async () => {
    const state = await read();
    if (!state) return null;
    if (accuracy != null && accuracy > MAX_ACCURACY_METERS) return state;
    if (!state.last) {
      state.last = { lat, lng };
    } else {
      const step = metersBetween(state.last, { lat, lng });
      if (step < MIN_STEP_METERS) return state;
      state.meters += step;
      state.last = { lat, lng };
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
    return state;
  });
}
