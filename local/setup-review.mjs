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
  getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, limit,
  writeBatch, deleteDoc,
} from 'firebase/firestore';

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
    await setDoc(ref, {
      name, email, isAdmin: false, teamId: null, gameId: null, pushToken: null,
      createdAt: Date.now(), acceptedTermsAt: Date.now(),
    });
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

// One game, found by its code so re-runs update it rather than add another
const existing = await getDocs(query(collection(db, 'games'), where('joinCode', '==', JOIN_CODE), limit(1)));
if (!existing.empty && !(existing.docs[0].data().hostIds ?? []).includes(hostUid)) {
  throw new Error(`Join code ${JOIN_CODE} is already used by another game`);
}
const gameRef = existing.empty ? doc(collection(db, 'games')) : existing.docs[0].ref;
await setDoc(gameRef, {
  name: 'Grand City Race Demo',
  startDateTime: Date.now() - 86400000,
  city: 'Cupertino',
  cityCoordinates: { lat: 37.3349, lng: -122.009 },
  questOrder: QUESTS.map(q => q.id),
  hostIds: [hostUid],
  joinCode: JOIN_CODE,
  themeId: 'retro',
  hotlineNumber: '',
  maxTeamSize: null,
  maxTeamSpreadMeters: null,
  startingCoins: 30,
  coinsPerQuest: 10,
  hintCost: 10,
  pausedAt: null,
  totalPausedMs: 0,
  endedAt: null,
});
for (const { id, ...q } of QUESTS) await setDoc(doc(gameRef, 'quests', id), { ...q, isActive: true });

// Reset: everything earlier review sessions left behind goes, so every
// reviewer starts fresh — the same as resetting a game in the console
async function clear(ref) {
  const snap = await getDocs(ref);
  for (const d of snap.docs) await deleteDoc(d.ref);
  return snap.size;
}
const oldTeams = await getDocs(query(collection(db, 'teams'), where('gameId', '==', gameRef.id)));
let cleared = 0;
for (const t of oldTeams.docs) {
  cleared += await clear(collection(t.ref, 'coinLedger'));
  await deleteDoc(t.ref);
}
for (const sub of ['activity', 'messages', 'attempts', 'private', 'players', 'recap']) {
  cleared += await clear(collection(gameRef, sub));
}
cleared += await clear(query(collection(db, 'trail'), where('gameId', '==', gameRef.id)));
console.log(`Cleared ${oldTeams.size} teams and ${cleared} other entries from earlier reviews`);
await signOut(auth);

// The player account starts outside the game, so a reviewer goes through
// entering the code and picking a team like anyone else
const playerUid = await account(PLAYER);
const batch = writeBatch(db);
batch.update(doc(db, 'users', playerUid), { gameId: null, teamId: null });
batch.delete(doc(db, 'games', gameRef.id, 'players', playerUid));
await batch.commit();
await signOut(auth);

console.log(`Review race ready: "Grand City Race Demo", join code ${JOIN_CODE}`);
console.log(`  player  ${PLAYER.email}`);
console.log(`  host    ${HOST.email}  (web console)`);
process.exit(0);
