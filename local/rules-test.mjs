// Firestore rules test suite.
//
//   1. firebase emulators:start --project rules-test --config firebase.rules-test.json
//   2. node local/rules-test.mjs
//
// Runs against a throwaway project on its own ports, so your dev data is untouched.
// Seeding goes through the emulator REST API with "Authorization: Bearer owner",
// which bypasses rules; every assertion then runs as a real signed-in user.
// Everything that decides a race is written by the server functions, so most
// of what is tested here is what players may NOT do.

import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, addDoc, getDoc,
  getDocs, deleteDoc, collection, collectionGroup, query, where, arrayUnion,
} from 'firebase/firestore';

const PROJECT = 'rules-test';
const AUTH_PORT = 9199;
const FIRESTORE_PORT = 8090;

const app = initializeApp({ apiKey: 'x', projectId: PROJECT });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, `http://127.0.0.1:${AUTH_PORT}`, { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', FIRESTORE_PORT);

const REST = `http://127.0.0.1:${FIRESTORE_PORT}/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH_REST = `http://127.0.0.1:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

// Plain values to the REST API's typed fields
function value(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, value(x)])) } };
}

async function seed(path, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]));
  const res = await fetch(`${REST}/${path}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`seed ${path}: ${await res.text()}`);
}

const results = [];
let section = '';
const group = name => { section = name; };
async function expect(name, shouldPass, fn) {
  try {
    const result = await fn();
    results.push({ section, name, ok: shouldPass, detail: typeof result === 'number' ? `${result} docs` : 'allowed' });
  } catch (e) {
    results.push({ section, name, ok: !shouldPass, detail: e.code ?? e.message });
  }
}

const tag = Date.now();
const id = suffix => `${suffix}_${tag}`;
const GAME = id('game');
const OTHER_GAME = id('othergame');
const TA = id('teamA');
const TB = id('teamB');

const people = {
  admin: { admin: true },
  host: {},
  playerA: { team: TA },
  mateA: { team: TA },
  playerB: { team: TB },
  outsider: {},
};

for (const [key, person] of Object.entries(people)) {
  person.email = `${key}${tag}@test.dev`;
  person.pass = 'pw1234';
  const { user } = await createUserWithEmailAndPassword(auth, person.email, person.pass);
  person.uid = user.uid;
  await signOut(auth);
  await seed(`users/${person.uid}`, { name: key, email: person.email, createdAt: 1 });
  if (person.admin) {
    const res = await fetch(`${AUTH_REST}/accounts:update`, {
      method: 'POST', headers: owner,
      body: JSON.stringify({ localId: person.uid, customAttributes: JSON.stringify({ admin: true }) }),
    });
    if (!res.ok) throw new Error(`admin claim: ${await res.text()}`);
  }
}
const { admin, host, playerA, mateA, playerB, outsider } = people;

const g = path => `games/${GAME}/${path}`;
await seed(`games/${GAME}`, {
  name: 'Hosted game', hostIds: [host.uid], joinCode: 'B7EKQ8', questOrder: ['q1', 'q2'],
  startDateTime: 1, pausedAt: null, endedAt: null, totalPausedMs: 0,
});
await seed(`games/${OTHER_GAME}`, { name: 'Someone else’s game', hostIds: [outsider.uid], joinCode: 'ZZZZZZ', questOrder: [] });
await seed(g('quests/q1'), { title: 'Q1', answers: ['seven'], hints: [] });
for (const p of [playerA, mateA, playerB]) {
  await seed(g(`players/${p.uid}`), { uid: p.uid, name: 'x', teamId: p.team, joinedAt: 1 });
}
for (const [team, members] of [[TA, [playerA, mateA]], [TB, [playerB]]]) {
  await seed(g(`teams/${team}`), { gameId: GAME, name: team, color: '#e11d48', memberIds: members.map(m => m.uid), solvedCount: 0, finishedAt: null });
  await seed(g(`teams/${team}/private/state`), { gameId: GAME, teamId: team, coins: 10, currentQuestId: null, completedQuestIds: [], hintsRevealed: {}, quest: null });
}
await seed(g(`teams/${TA}/coinLedger/l1`), { delta: 5, reason: 'x', balanceAfter: 15, byName: 'host', at: 1 });
await seed(g('activity/pub'), { type: 'quest_solved', at: 1, visibility: 'public', teamId: TA, teamName: 'A' });
await seed(g('activity/privA'), { type: 'hint_revealed', at: 2, visibility: 'team', teamId: TA, teamName: 'A' });
await seed(g('activity/privB'), { type: 'hint_revealed', at: 3, visibility: 'team', teamId: TB, teamName: 'B' });
await seed(g('messages/mA'), { teamId: TA, authorId: playerA.uid, authorName: 'A', fromHost: false, text: 'team A only', sentAt: 1 });
await seed(g('messages/mB'), { teamId: TB, authorId: playerB.uid, authorName: 'B', fromHost: false, text: 'team B only', sentAt: 2 });
await seed(g('attempts/a1'), { questId: 'q1', teamId: TA, teamName: 'A', text: 'six', at: 1 });
await seed(g('positions/' + playerB.uid), { uid: playerB.uid, teamId: TB, lat: 1, lng: 2, updatedAt: 1 });
await seed(g('trail/t1'), { uid: playerA.uid, teamId: TA, lat: 1, lng: 2, t: 1 });
await seed(g('recap/summary'), { version: 1, publishedAt: null });

const as = async who => {
  await signOut(auth).catch(() => {});
  await signInWithEmailAndPassword(auth, who.email, who.pass);
};
const count = async q => (await getDocs(q)).docs.length;
const state = team => doc(db, g(`teams/${team}/private/state`));

// ── profiles are private ──────────────────────────────────────────────────
group('profiles');
await as(playerA);
await expect('reads their own profile', true, () => getDoc(doc(db, 'users', playerA.uid)));
await expect("CANNOT read a teammate's profile (email)", false, () => getDoc(doc(db, 'users', mateA.uid)));
await expect('changes their name', true, () => updateDoc(doc(db, 'users', playerA.uid), { name: 'Ann' }));
await expect('adds a push token', true, () => updateDoc(doc(db, 'users', playerA.uid), { pushTokens: arrayUnion('ExponentPushToken[a]') }));
await expect('CANNOT make themselves admin', false, () => updateDoc(doc(db, 'users', playerA.uid), { isAdmin: true }));
await expect('CANNOT give themselves a team on the profile', false, () => updateDoc(doc(db, 'users', playerA.uid), { teamId: TB }));
await as(admin);
await expect('an admin reads any profile', true, () => getDoc(doc(db, 'users', playerA.uid)));
await expect('an admin lists all users', true, () => count(collection(db, 'users')));
await as(host);
await expect('CANNOT list all users as a host', false, () => count(collection(db, 'users')));
await as(admin);
await expect("an admin sees everyone's memberships across games", true, () => count(collectionGroup(db, 'players')));
await expect('an admin sees every team across games', true, () => count(collectionGroup(db, 'teams')));
await as(host);
await expect('CANNOT see every team across games as a host', false, () => count(collectionGroup(db, 'teams')));

// ── app settings ──────────────────────────────────────────────────────────
group('app settings');
const appSettings = doc(db, 'settings', 'app');
await as(admin);
await expect('an admin sets the oldest app version', true, () => setDoc(appSettings, { minClientVersion: 1 }));
await as(host);
await expect('CANNOT set it as a host', false, () => setDoc(appSettings, { minClientVersion: 9 }));
await signOut(auth);
await expect('read before signing in', true, () => getDoc(appSettings));

// ── games ─────────────────────────────────────────────────────────────────
group('games');
await as(playerA);
await expect('a player reads the game they are in', true, () => getDoc(doc(db, 'games', GAME)));
await expect('CANNOT read a game they are not in', false, () => getDoc(doc(db, 'games', OTHER_GAME)));
await expect('CANNOT search games by invite code (joining goes through the server)', false, () =>
  count(query(collection(db, 'games'), where('joinCode', '==', 'ZZZZZZ'))));
await expect('CANNOT change the game', false, () => updateDoc(doc(db, 'games', GAME), { name: 'hax' }));
await as(host);
await expect('a host lists the games they run', true, () =>
  count(query(collection(db, 'games'), where('hostIds', 'array-contains', host.uid))));
await expect('a host edits the settings', true, () => updateDoc(doc(db, 'games', GAME), { name: 'Renamed', startDateTime: 2 }));
await expect('CANNOT end the race directly', false, () => updateDoc(doc(db, 'games', GAME), { endedAt: 5 }));
await expect('CANNOT pause it directly', false, () => updateDoc(doc(db, 'games', GAME), { pausedAt: 5 }));
await expect('CANNOT change who hosts it directly', false, () => updateDoc(doc(db, 'games', GAME), { hostIds: [host.uid, outsider.uid] }));
await expect('CANNOT delete it directly (the server deletes everything under it)', false, () => deleteDoc(doc(db, 'games', GAME)));
await expect("CANNOT read someone else's game", false, () => getDoc(doc(db, 'games', OTHER_GAME)));
await as(outsider);
await expect('anyone creates a game they host', true, () =>
  setDoc(doc(db, 'games', id('newgame')), { name: 'Mine', hostIds: [outsider.uid], pausedAt: null, endedAt: null, totalPausedMs: 0 }));
await expect('CANNOT create one hosted by someone else', false, () =>
  setDoc(doc(db, 'games', id('newgame2')), { name: 'Theirs', hostIds: [host.uid] }));
await expect('CANNOT create one already over', false, () =>
  setDoc(doc(db, 'games', id('newgame3')), { name: 'Over', hostIds: [outsider.uid], endedAt: 5 }));
await as(admin);
await expect('an admin reads any game', true, () => getDoc(doc(db, 'games', OTHER_GAME)));
await expect('an admin edits any game', true, () => updateDoc(doc(db, 'games', OTHER_GAME), { name: 'Admin can' }));

// ── quests hold the answers: hosts only ───────────────────────────────────
group('quests');
await as(playerA);
await expect('CANNOT read a quest (answers)', false, () => getDoc(doc(db, g('quests/q1'))));
await expect('CANNOT list quests', false, () => count(collection(db, g('quests'))));
await as(host);
await expect('a host reads quests', true, () => getDoc(doc(db, g('quests/q1'))));
await expect('a host writes quests', true, () => setDoc(doc(db, g('quests/q2')), { title: 'Q2', answers: ['x'] }));

// ── players and teams ─────────────────────────────────────────────────────
group('players and teams');
await as(playerA);
await expect("lists the game's players", true, () => count(collection(db, g('players'))));
await expect('finds their own entries in every game', true, () =>
  count(query(collectionGroup(db, 'players'), where('uid', '==', playerA.uid))));
await expect("CANNOT list everyone's entries across games", false, () => count(collectionGroup(db, 'players')));
await expect('CANNOT write their own entry (joining goes through the server)', false, () =>
  updateDoc(doc(db, g(`players/${playerA.uid}`)), { teamId: TB }));
await expect('reads the teams', true, () => count(collection(db, g('teams'))));
await expect('CANNOT change a team', false, () => updateDoc(doc(db, g(`teams/${TA}`)), { solvedCount: 5 }));
await as(outsider);
await expect("CANNOT list a game's players from outside", false, () => count(collection(db, g('players'))));
await expect("CANNOT read a game's teams from outside", false, () => count(collection(db, g('teams'))));

// ── a team's private state: the team and its hosts ────────────────────────
group('team state');
await as(playerA);
await expect("reads their team's coins and quest", true, () => getDoc(state(TA)));
await expect('CANNOT give themselves coins', false, () => updateDoc(state(TA), { coins: 999 }));
await expect('CANNOT move on to the next quest', false, () => updateDoc(state(TA), { currentQuestId: 'q2' }));
await expect('CANNOT buy a shield by writing it', false, () => updateDoc(state(TA), { shields: 3 }));
await expect('marks the chat as read', true, () => updateDoc(state(TA), { teamChatReadAt: 5 }));
await expect("CANNOT mark the hosts' side read", false, () => updateDoc(state(TA), { hostChatReadAt: 5 }));
await expect("reads their team's coin history", true, () => count(collection(db, g(`teams/${TA}/coinLedger`))));
await as(playerB);
await expect("CANNOT read a rival's coins and shields", false, () => getDoc(state(TA)));
await expect("CANNOT read a rival's coin history", false, () => count(collection(db, g(`teams/${TA}/coinLedger`))));
await expect("CANNOT list every team's state", false, () =>
  count(query(collectionGroup(db, 'private'), where('gameId', '==', GAME))));
await as(host);
await expect("a host reads every team's state at once", true, () =>
  count(query(collectionGroup(db, 'private'), where('gameId', '==', GAME))));
await expect('a host marks a thread read', true, () => updateDoc(state(TA), { hostChatReadAt: 5 }));
await expect('CANNOT change coins directly as a host', false, () => updateDoc(state(TA), { coins: 0 }));

// ── the board ─────────────────────────────────────────────────────────────
group('activity');
await as(playerA);
await expect('reads the public board', true, () =>
  count(query(collection(db, g('activity')), where('visibility', '==', 'public'))));
await expect("reads their team's own entries", true, () =>
  count(query(collection(db, g('activity')), where('teamId', '==', TA))));
await expect("CANNOT read a rival's team entries", false, () => getDoc(doc(db, g('activity/privB'))));
await expect('CANNOT write an entry', false, () =>
  addDoc(collection(db, g('activity')), { type: 'quest_solved', at: 9, visibility: 'public', teamId: TA, teamName: 'A' }));
await as(host);
await expect('a host posts a note', true, () =>
  addDoc(collection(db, g('activity')), { type: 'admin_note', at: 9, visibility: 'public', teamId: null, teamName: null, text: 'hi' }));
await as(outsider);
await expect('CANNOT read the board from outside', false, () =>
  count(query(collection(db, g('activity')), where('visibility', '==', 'public'))));

// ── chat ──────────────────────────────────────────────────────────────────
group('chat');
const message = (teamId, uid, extra = {}) => ({ teamId, authorId: uid, authorName: 'x', fromHost: false, text: 'hello', sentAt: 9, ...extra });
await as(playerA);
await expect("reads their team's thread", true, () => count(query(collection(db, g('messages')), where('teamId', '==', TA))));
await expect("CANNOT read a rival's thread", false, () => getDoc(doc(db, g('messages/mB'))));
await expect('writes in their thread', true, () => addDoc(collection(db, g('messages')), message(TA, playerA.uid)));
await expect("CANNOT write in a rival's thread", false, () => addDoc(collection(db, g('messages')), message(TB, playerA.uid)));
await expect('CANNOT write as a host', false, () => addDoc(collection(db, g('messages')), message(TA, playerA.uid, { fromHost: true })));
await expect('CANNOT write as someone else', false, () => addDoc(collection(db, g('messages')), message(TA, mateA.uid)));
await expect('CANNOT write a message of 2000 characters', false, () =>
  addDoc(collection(db, g('messages')), message(TA, playerA.uid, { text: 'x'.repeat(2000) })));
await as(host);
await expect('a host replies', true, () => addDoc(collection(db, g('messages')), message(TA, host.uid, { fromHost: true })));
await expect('a host clears a message', true, () => deleteDoc(doc(db, g('messages/mB'))));
await as(outsider);
await expect('CANNOT write in a game they are not in', false, () => addDoc(collection(db, g('messages')), message(TA, outsider.uid)));

// ── wrong answers: hosts only ─────────────────────────────────────────────
group('attempts');
await as(playerA);
await expect('CANNOT read wrong answers', false, () => getDoc(doc(db, g('attempts/a1'))));
await expect('CANNOT write one', false, () => addDoc(collection(db, g('attempts')), { questId: 'q1', teamId: TA, text: 'x', at: 1 }));
await as(host);
await expect('a host reads them', true, () => count(collection(db, g('attempts'))));

// ── positions and trail ───────────────────────────────────────────────────
group('positions and trail');
const position = (uid, teamId) => ({ uid, teamId, lat: 1, lng: 2, updatedAt: 9 });
await as(playerA);
await expect('saves their position', true, () => setDoc(doc(db, g(`positions/${playerA.uid}`)), position(playerA.uid, TA)));
await expect('CANNOT save it under another team', false, () => setDoc(doc(db, g(`positions/${playerA.uid}`)), position(playerA.uid, TB)));
await expect("CANNOT save a teammate's", false, () => setDoc(doc(db, g(`positions/${mateA.uid}`)), position(mateA.uid, TA)));
await expect('adds a trail point', true, () => addDoc(collection(db, g('trail')), { uid: playerA.uid, teamId: TA, lat: 1, lng: 2, t: 9 }));
await expect("CANNOT add one for a teammate", false, () => addDoc(collection(db, g('trail')), { uid: mateA.uid, teamId: TA, lat: 1, lng: 2, t: 9 }));
await expect('CANNOT read the trail', false, () => count(collection(db, g('trail'))));
await as(mateA);
await expect("reads teammates' positions (spread check)", true, () =>
  count(query(collection(db, g('positions')), where('teamId', '==', TA))));
await expect("CANNOT read a rival's position", false, () => getDoc(doc(db, g(`positions/${playerB.uid}`))));
await as(host);
await expect('a host reads every position', true, () => count(collection(db, g('positions'))));
await expect('a host reads the trail', true, () => count(collection(db, g('trail'))));

// ── the recap ─────────────────────────────────────────────────────────────
group('recap');
const recap = doc(db, g('recap/summary'));
await as(playerA);
await expect('CANNOT read it before a host shows it', false, () => getDoc(recap));
await expect('CANNOT write it', false, () => setDoc(recap, { publishedAt: 5 }));
await as(host);
await expect('a host reads it', true, () => getDoc(recap));
await expect('CANNOT write it directly (the server builds it)', false, () => setDoc(recap, { publishedAt: 5 }));
await seed(g('recap/summary'), { version: 1, publishedAt: 5 });
await as(playerA);
await expect('reads it once shown', true, () => getDoc(recap));
await as(outsider);
await expect('CANNOT read it from outside', false, () => getDoc(recap));

let current = '';
for (const r of results) {
  if (r.section !== current) { current = r.section; console.log(`\n── ${current} ──`); }
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${r.detail})`);
}
const failed = results.filter(r => !r.ok);
console.log(failed.length
  ? `\n${failed.length} of ${results.length} FAILED`
  : `\nALL ${results.length} RULES TESTS PASSED`);
process.exit(failed.length ? 1 : 0);
