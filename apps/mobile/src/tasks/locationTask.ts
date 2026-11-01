import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { hasStarted, isTestTeam, paths, type Game, type Team } from '@grandcityrace/shared';
import { auth, db } from '../firebase';
import { recordPosition } from './distanceTracker';
import { savePosition, addTrailPoint } from '../utils/position';

export const TASK_NAME = 'gcr-background-location';

// How often the task looks up whether the race is still on for the player
const CHECK_EVERY_MS = 5 * 60_000;
const CHECKED_KEY = 'locationTaskCheckedAt';

TaskManager.defineTask(TASK_NAME, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
  if (error) return;
  const locations = data?.locations;
  if (!locations?.length) return;

  // iOS keeps the task running, and relaunches the app for it, after the app
  // is closed. So the task can't count on the game screen to stop it: it
  // stops itself once there is no race to report to.
  const [uid, teamId, gameId] = await AsyncStorage.multiGet(['uid', 'teamId', 'gameId'])
    .then(pairs => pairs.map(([, v]) => v));
  if (!uid || !teamId || !gameId) return stopBackgroundTracking();
  await auth.authStateReady();
  if (auth.currentUser?.uid !== uid) return stopBackgroundTracking();
  if (await raceIsOver(gameId, teamId)) return stopBackgroundTracking();

  for (const loc of locations) {
    await recordPosition(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy);
  }

  const { latitude: lat, longitude: lng } = locations[locations.length - 1].coords;
  const t = Date.now();

  await savePosition(gameId, uid, teamId, lat, lng, t).catch(() => {});
  await addTrailPoint(gameId, uid, teamId, lat, lng, t).catch(() => {});
});

// Whether the race has ended for the player: the game ended or is gone, the
// team finished or was deleted, or a test run's race has started. Looked up
// every few minutes only; a failed lookup keeps the task running.
async function raceIsOver(gameId: string, teamId: string) {
  const checkedAt = Number(await AsyncStorage.getItem(CHECKED_KEY).catch(() => null)) || 0;
  if (Date.now() - checkedAt < CHECK_EVERY_MS) return false;
  try {
    const [gameSnap, teamSnap] = await Promise.all([
      getDoc(doc(db, paths.game(gameId))),
      getDoc(doc(db, paths.team(gameId, teamId))),
    ]);
    await AsyncStorage.setItem(CHECKED_KEY, String(Date.now())).catch(() => {});
    const game = gameSnap.data() as Game | undefined;
    const team = teamSnap.data() as Team | undefined;
    if (!game || !team) return true;
    if (game.endedAt || team.finishedAt) return true;
    return isTestTeam(teamId) && hasStarted(game, Date.now());
  } catch {
    return false;
  }
}

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
  await AsyncStorage.multiRemove(['uid', 'teamId', 'gameId', CHECKED_KEY]).catch(() => {});
}

// Nobody signed in, nothing to track: this also catches a task left running
// from a session that ended while the app was closed
onAuthStateChanged(auth, user => {
  if (!user) stopBackgroundTracking();
});
