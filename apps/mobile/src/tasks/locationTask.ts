import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordPosition } from './distanceTracker';
import { savePosition, addTrailPoint } from '../utils/position';

export const TASK_NAME = 'gcr-background-location';

TaskManager.defineTask(TASK_NAME, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
  if (error) return;
  const locations = data?.locations;
  if (!locations?.length) return;

  for (const loc of locations) {
    await recordPosition(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy);
  }

  const [uid, teamId, gameId] = await AsyncStorage.multiGet(['uid', 'teamId', 'gameId'])
    .then(pairs => pairs.map(([, v]) => v));
  if (!uid || !teamId || !gameId) return;

  const { latitude: lat, longitude: lng } = locations[locations.length - 1].coords;
  const t = Date.now();

  await savePosition(gameId, uid, teamId, lat, lng, t).catch(() => {});
  await addTrailPoint(gameId, uid, teamId, lat, lng, t).catch(() => {});
});

// Background location is for the race and nothing else: stopped when the
// player leaves the game, signs out, or the race is over for them, and the
// saved ids go with it so a stray update has nowhere to write.
export async function stopBackgroundTracking() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) {
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    }
  } catch {
    // Not available in this host app; nothing was started
  }
  await AsyncStorage.multiRemove(['uid', 'teamId', 'gameId']).catch(() => {});
}
