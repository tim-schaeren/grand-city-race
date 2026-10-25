// Sets up what app store reviewers need, in PRODUCTION: a host account, a
// player account, and a demo race they can play from anywhere — every quest
// unlocks without being at a place. Goes through the normal sign-up and the
// security rules like any host would; no admin credentials involved.
//
//   cd apps/mobile && REVIEW_HOST_PASSWORD=… REVIEW_PLAYER_PASSWORD=… \
//     node --env-file=.env ../../local/setup-review.mjs
//
// Safe to re-run: existing accounts are signed into, and the demo game is
// found by its join code and brought back to its starting state.

import { initializeApp } from 'firebase/app';
import {
  initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, getDocs, updateDoc, collection, query, where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const env = process.env;
for (const k of ['EXPO_PUBLIC_FIREBASE_API_KEY', 'REVIEW_HOST_PASSWORD', 'REVIEW_PLAYER_PASSWORD']) {
  if (!env[k]) throw new Error(`${k} is not set`);
}
if (env.EXPO_PUBLIC_EMULATOR_HOST) throw new Error('EXPO_PUBLIC_EMULATOR_HOST is set — this script is for production');

const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = initializeAuth(app, { persistence: inMemoryPersistence });
const db = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');
const call = (fn, data) => httpsCallable(functions, fn)(data);

const HOST = { name: 'Review Host', email: 'review-host@grandcityrace.example', password: env.REVIEW_HOST_PASSWORD };
const PLAYER = { name: 'App Reviewer', email: 'review-player@grandcityrace.example', password: env.REVIEW_PLAYER_PASSWORD };
const JOIN_CODE = 'PLAY26';

async function account({ name, email, password }) {
  let user;
  try {
    ({ user } = await signInWithEmailAndPassword(auth, email, password));
  } catch (e) {
    if (e.code !== 'auth/invalid-credential' && e.code !== 'auth/user-not-found') throw e;
    ({ user } = await createUserWithEmailAndPassword(auth, email, password));
  }
  const ref = doc(db, 'users', user.uid);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, { name, email, createdAt: Date.now(), acceptedTermsAt: Date.now() });
  }
  return user.uid;
}

const text = t => [{ type: 'text', text: t }];
const QUESTS = [
  {
    id: 'welcome', title: 'Welcome', trigger: 'none', task: 'continue',
    description: text('In a real race, each quest unlocks when your team reaches a place or has walked far enough. In this demo every quest is open, so you can play from anywhere. Tap Continue.'),
  },
  {
    id: 'colours', title: 'Colour Check', trigger: 'none', task: 'answer',
    description: text('This race uses the Retro theme its host picked. What colour is the background?'),
    answers: ['orange', 'tangerine', 'red'],
    hints: [{ blocks: text('It is named after a citrus fruit.') }, { blocks: text('Try "orange".') }],
  },
  {
    id: 'break', title: 'Short Break', trigger: 'none', task: 'timer', durationSeconds: 30,
    description: text('Hosts can make teams wait, for a lunch stop or a ferry. This one is 30 seconds.'),
  },
  {
    id: 'finale', title: 'Finish Line', trigger: 'none', task: 'answer',
    description: text('Type the word RACE to finish the demo.'),
    answers: ['race'],
    hints: [{ blocks: text('Four letters: R, A, C, E.') }],
  },
];

const hostUid = await account(HOST);

// One game, found among the host's by its code, so re-runs update it rather
// than add another
const hosted = await getDocs(query(collection(db, 'games'), where('hostIds', 'array-contains', hostUid)));
const existing = hosted.docs.find(d => d.data().joinCode === JOIN_CODE);
const settings = {
  name: 'Grand City Race Demo',
  startDateTime: Date.now() - 86400000,
  city: 'Cupertino',
  cityCoordinates: { lat: 37.3349, lng: -122.009 },
  questOrder: QUESTS.map(q => q.id),
  joinCode: JOIN_CODE,
  themeId: 'retro',
  hotlineNumber: '',
  maxTeamSize: null,
  maxTeamSpreadMeters: null,
  startingCoins: 30,
  coinsPerQuest: 10,
  hintCost: 10,
};
const gameRef = existing ? existing.ref : doc(collection(db, 'games'));
if (existing) {
  // Reset: every team goes and the race starts over, so every reviewer
  // starts fresh, the same as a host would in the console
  const teams = await getDocs(collection(gameRef, 'teams'));
  for (const t of teams.docs) await call('host', { action: 'deleteTeam', gameId: gameRef.id, teamId: t.id });
  await call('host', { action: 'reset', gameId: gameRef.id });
  await updateDoc(gameRef, settings);
  console.log(`Cleared ${teams.size} teams and everything earlier reviews left`);
} else {
  await setDoc(gameRef, { ...settings, hostIds: [hostUid], pausedAt: null, totalPausedMs: 0, endedAt: null });
}
for (const { id, ...q } of QUESTS) await setDoc(doc(gameRef, 'quests', id), { ...q, isActive: true });
await signOut(auth);

// The player account starts outside the game, so a reviewer goes through
// entering the code and picking a team like anyone else
await account(PLAYER);
await call('play', { action: 'leaveGame', gameId: gameRef.id });
await signOut(auth);

console.log(`Review race ready: "Grand City Race Demo", join code ${JOIN_CODE}`);
console.log(`  player  ${PLAYER.email}`);
console.log(`  host    ${HOST.email}  (web console)`);
process.exit(0);
