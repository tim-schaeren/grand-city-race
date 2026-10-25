// Firestore rules test suite.
//
//   1. firebase emulators:start --project rules-test --config firebase.rules-test.json
//   2. node local/rules-test.mjs
//
// Runs against a throwaway project on its own ports, so your dev data is untouched.
// Seeding goes through the emulator REST API with "Authorization: Bearer owner",
// which bypasses rules; every assertion then runs as a real signed-in user.

import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, addDoc, getDoc,
  getDocs, collection, query, where, orderBy, documentId, writeBatch, deleteDoc, deleteField,
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
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const S = v => ({ stringValue: v });
const B = v => ({ booleanValue: v });
const I = v => ({ integerValue: String(v) });
const ARR = v => ({ arrayValue: { values: v } });

async function seed(path, fields) {
  const res = await fetch(`${REST}/${path}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`seed ${path}: ${await res.text()}`);
}

const results = [];
let section = '';
const group = name => { section = name; };
async function expect(name, shouldPass, fn) {
  try {
    const value = await fn();
    results.push({ section, name, ok: shouldPass, detail: typeof value === 'number' ? `${value} docs` : 'allowed' });
  } catch (e) {
    results.push({ section, name, ok: !shouldPass, detail: e.code ?? e.message });
  }
}

const tag = Date.now();
const id = suffix => `${suffix}_${tag}`;
const GAME = id('game');
const GAME_NO_HOSTS = id('legacygame');
const TEAM_A = id('teamA');
const TEAM_B = id('teamB');
const QUEST = 'q1';

// A deliberately incomplete profile: what the app wrote before it set isAdmin/teamId.
// Rules must cope, since accounts like this exist in production.
const people = {
  admin:   { isAdmin: true,  teamId: null,   sparse: false },
  host:    { isAdmin: false, teamId: null,   sparse: false },
  playerA: { isAdmin: false, teamId: TEAM_A, sparse: true  },
  mateA:   { isAdmin: false, teamId: TEAM_A, sparse: false },
  playerB: { isAdmin: false, teamId: TEAM_B, sparse: false },
  outsider:{ isAdmin: false, teamId: null,   sparse: false },
};

for (const [key, person] of Object.entries(people)) {
  person.email = `${key}${tag}@test.dev`;
  person.pass = 'pw1234';
  const { user } = await createUserWithEmailAndPassword(auth, person.email, person.pass);
  person.uid = user.uid;
  await signOut(auth);
  const fields = { name: S(key), email: S(person.email), createdAt: I(1) };
  if (!person.sparse) {
    fields.isAdmin = B(person.isAdmin);
    fields.pushToken = { nullValue: null };
  }
  if (person.teamId) fields.teamId = S(person.teamId);
  else if (!person.sparse) fields.teamId = { nullValue: null };
  await seed(`users/${person.uid}`, fields);
}

const JOIN_CODE = 'B7EKQ8';
await seed(`games/${GAME}`, { name: S('Hosted game'), hostIds: ARR([S(people.host.uid)]), joinCode: S(JOIN_CODE), questOrder: ARR([S(QUEST), S('q2')]) });
await seed(`games/${GAME_NO_HOSTS}`, { name: S('Game with no hostIds'), questOrder: ARR([]) });
await seed(`teams/${TEAM_A}`, {
  name: S('Team A'), gameId: S(GAME), memberIds: ARR([S(people.playerA.uid), S(people.mateA.uid)]),
  currentQuestId: S(QUEST), completedQuestIds: ARR([]), coins: I(10), finishedAt: { nullValue: null },
});
await seed(`teams/${TEAM_B}`, {
  name: S('Team B'), gameId: S(GAME), memberIds: ARR([S(people.playerB.uid)]),
  currentQuestId: S(QUEST), completedQuestIds: ARR([]), coins: I(10), finishedAt: { nullValue: null },
});
await seed(`games/${GAME}/activity/pub`, { type: S('quest_solved'), at: I(1), visibility: S('public'), teamId: S(TEAM_A), teamName: S('Team A') });
await seed(`games/${GAME}/activity/privA`, { type: S('hint_revealed'), at: I(2), visibility: S('team'), teamId: S(TEAM_A), teamName: S('Team A') });
await seed(`games/${GAME}/activity/privB`, { type: S('hint_revealed'), at: I(3), visibility: S('team'), teamId: S(TEAM_B), teamName: S('Team B') });
await seed(`games/${GAME}/activity/note`, { type: S('admin_note'), at: I(4), visibility: S('public'), teamId: { nullValue: null }, teamName: { nullValue: null }, text: S('hello') });
await seed(`games/${GAME}/messages/mA`, { teamId: S(TEAM_A), authorId: S(people.playerA.uid), authorName: S('A'), fromHost: B(false), text: S('team A only'), sentAt: I(1) });
await seed(`games/${GAME}/messages/mB`, { teamId: S(TEAM_B), authorId: S(people.playerB.uid), authorName: S('B'), fromHost: B(false), text: S('team B only'), sentAt: I(2) });
await seed(`games/${GAME}/attempts/a1`, { questId: S(QUEST), teamId: S(TEAM_A), teamName: S('Team A'), text: S('seven'), at: I(1) });
await seed(`trail/tr1_${tag}`, { userId: S(people.playerA.uid), teamId: S(TEAM_A), gameId: S(GAME), lat: { doubleValue: 1 }, lng: { doubleValue: 2 }, t: I(1) });
await seed(`games/${GAME}/players/${people.playerA.uid}`, { id: S(people.playerA.uid), name: S('A'), joinedAt: I(1) });
await seed(`games/${GAME_NO_HOSTS}/players/${people.playerA.uid}`, { id: S(people.playerA.uid), name: S('A'), joinedAt: I(1) });
await seed(`trail/legacy_${tag}`, { userId: S(people.playerA.uid), teamId: S(TEAM_A), gameId: S(GAME_NO_HOSTS), lat: { doubleValue: 1 }, lng: { doubleValue: 2 }, t: I(1) });

const as = async who => {
  await signOut(auth).catch(() => {});
  await signInWithEmailAndPassword(auth, people[who].email, people[who].pass);
};
const activity = collection(db, 'games', GAME, 'activity');
const messages = collection(db, 'games', GAME, 'messages');
const attempts = collection(db, 'games', GAME, 'attempts');
const solvedEntry = {
  type: 'quest_solved', at: Date.now(), visibility: 'public',
  teamId: TEAM_A, teamName: 'Team A', questTitle: 'Q1', questNumber: 1,
};

// ── A player with an incomplete profile can still play ──────────────────────
group('player (sparse profile)');
await as('playerA');
await expect('solves a quest: progress + board entry in one batch', true, () => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', TEAM_A), { completedQuestIds: [QUEST], currentQuestId: 'q2', questProgress: null, coins: 20 });
  batch.set(doc(db, 'games', GAME, 'activity', `${TEAM_A}_quest_solved_${QUEST}`), solvedEntry);
  return batch.commit();
});
await expect('a teammate repeating the same solve is an allowed overwrite', true, () => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', TEAM_A), { coins: 20 });
  batch.set(doc(db, 'games', GAME, 'activity', `${TEAM_A}_quest_solved_${QUEST}`), solvedEntry);
  return batch.commit();
});
await expect('reveals a hint', true, () => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', TEAM_A), { coins: 10, hintsRevealed: { [QUEST]: 1 } });
  batch.set(doc(db, 'games', GAME, 'activity', `${TEAM_A}_hint_${QUEST}_1`), {
    type: 'hint_revealed', at: Date.now(), visibility: 'team', teamId: TEAM_A, teamName: 'Team A', questTitle: 'Q1', amount: 10,
  });
  return batch.commit();
});
await expect('buys a compass: coins, timer and a private entry', true, () => {
  const batch = writeBatch(db);
  const until = Date.now() + 5 * 60000;
  batch.update(doc(db, 'teams', TEAM_A), { coins: 5, activeCompassUntil: until });
  batch.set(doc(db, 'games', GAME, 'activity', `${TEAM_A}_compass_${until}`), {
    type: 'item_bought', at: Date.now(), visibility: 'team', teamId: TEAM_A,
    teamName: 'Team A', itemName: 'a compass', amount: 25,
  });
  return batch.commit();
});
await expect('records a wrong answer', true, () => addDoc(attempts, { questId: QUEST, teamId: TEAM_A, teamName: 'Team A', text: 'seven', at: Date.now() }));
await expect('sends a chat message', true, () => addDoc(messages, { teamId: TEAM_A, authorId: people.playerA.uid, authorName: 'A', fromHost: false, text: 'hi', sentAt: Date.now() }));
await expect('marks the chat thread read', true, () => updateDoc(doc(db, 'teams', TEAM_A), { teamChatReadAt: Date.now() }));
await expect('writes own location', true, () => updateDoc(doc(db, 'users', people.playerA.uid), { lastLocation: { lat: 1, lng: 2, updatedAt: Date.now() } }));
await expect('adds a trail point', true, () => addDoc(collection(db, 'trail'), { userId: people.playerA.uid, teamId: TEAM_A, gameId: GAME, lat: 1, lng: 2, t: Date.now() }));
await expect('reads teammate locations (spread check)', true, async () =>
  (await getDocs(query(collection(db, 'users'), where(documentId(), 'in', [people.playerA.uid, people.mateA.uid])))).docs.length);
await expect('reads the public board', true, async () =>
  (await getDocs(query(activity, where('visibility', '==', 'public'), orderBy('at', 'desc')))).docs.length);
await expect('reads own team board entries', true, async () =>
  (await getDocs(query(activity, where('teamId', '==', TEAM_A), orderBy('at', 'desc')))).docs.length);
await expect('reads own chat thread', true, async () =>
  (await getDocs(query(messages, where('teamId', '==', TEAM_A), orderBy('sentAt')))).docs.length);

// ── and cannot do a host's job, or peek at rivals ───────────────────────────
group('player limits');
await expect("cannot read a rival's private entries", false, async () =>
  (await getDocs(query(activity, where('teamId', '==', TEAM_B), orderBy('at', 'desc')))).docs.length);
await expect('cannot read the whole board unfiltered', false, async () =>
  (await getDocs(query(activity, orderBy('at', 'desc')))).docs.length);
await expect("cannot read a rival's chat thread", false, async () =>
  (await getDocs(query(messages, where('teamId', '==', TEAM_B), orderBy('sentAt')))).docs.length);
await expect('cannot read wrong answers, not even its own', false, async () => (await getDocs(attempts)).docs.length);
await expect('cannot rename its team', false, () => updateDoc(doc(db, 'teams', TEAM_A), { name: 'hax' }));
await expect('cannot edit a quest', false, () => setDoc(doc(db, 'games', GAME, 'quests', QUEST), { title: 'hax' }));
await expect('cannot edit the game', false, () => updateDoc(doc(db, 'games', GAME), { name: 'hax' }));
await expect('cannot make itself a host', false, () => updateDoc(doc(db, 'games', GAME), { hostIds: [people.playerA.uid] }));
await expect('cannot overwrite an admin note', false, () => setDoc(doc(db, 'games', GAME, 'activity', 'note'), solvedEntry));
await expect("cannot overwrite a rival's entry", false, () => setDoc(doc(db, 'games', GAME, 'activity', 'privB'), solvedEntry));
await expect('cannot write a board entry as another team', false, () => setDoc(doc(db, 'games', GAME, 'activity', id('forged')), { ...solvedEntry, teamId: TEAM_B }));
await expect('cannot post a chat message as a host', false, () => addDoc(messages, { teamId: TEAM_A, authorId: people.playerA.uid, authorName: 'A', fromHost: true, text: 'free coins', sentAt: Date.now() }));
await expect('cannot forge the author of a message', false, () => addDoc(messages, { teamId: TEAM_A, authorId: people.playerB.uid, authorName: 'B', fromHost: false, text: 'x', sentAt: Date.now() }));
await expect('cannot record a wrong answer for another team', false, () => addDoc(attempts, { questId: QUEST, teamId: TEAM_B, teamName: 'Team B', text: 'x', at: Date.now() }));
await expect('cannot forge the host read marker', false, () => updateDoc(doc(db, 'teams', TEAM_A), { hostChatReadAt: Date.now() }));
await expect('cannot sneak a rename in with an allowed field', false, () => updateDoc(doc(db, 'teams', TEAM_A), { coins: 1, name: 'hax' }));
await expect('cannot read the trail', false, async () =>
  (await getDocs(query(collection(db, 'trail'), where('gameId', '==', GAME)))).docs.length);

// ── self-service: joining a game by code, then a team ──────────────────────
group('self-service');
await as('outsider');
const OUTSIDER = people.outsider.uid;
await expect('finds a game by its invite code', true, async () =>
  (await getDocs(query(collection(db, 'games'), where('joinCode', '==', JOIN_CODE)))).docs.length);
await expect('joins the game (own membership doc)', true, () =>
  setDoc(doc(db, 'games', GAME, 'players', OUTSIDER), { id: OUTSIDER, name: 'outsider', joinedAt: Date.now() }));
await expect('CANNOT join as somebody else', false, () =>
  setDoc(doc(db, 'games', GAME, 'players', people.playerB.uid), { id: people.playerB.uid, name: 'not me', joinedAt: Date.now() }));
await expect('records the game on their own profile', true, () =>
  updateDoc(doc(db, 'users', OUTSIDER), { gameId: GAME }));
await expect('starts a team in a game they joined', true, () =>
  setDoc(doc(db, 'teams', id('newteam')), {
    name: 'The Newcomers', color: '#111', gameId: GAME, memberIds: [OUTSIDER],
    coins: 0, currentQuestId: null, completedQuestIds: [], finishedAt: null, questProgress: null,
  }));
await expect('CANNOT start a team with somebody else in it', false, () =>
  setDoc(doc(db, 'teams', id('forgedteam')), {
    name: 'Forged', color: '#111', gameId: GAME, memberIds: [OUTSIDER, people.playerB.uid],
    coins: 0, currentQuestId: null, completedQuestIds: [], finishedAt: null, questProgress: null,
  }));
await expect('CANNOT start a team in a game they never joined', false, () =>
  setDoc(doc(db, 'teams', id('otherteam')), {
    name: 'Nope', color: '#111', gameId: GAME_NO_HOSTS, memberIds: [OUTSIDER],
    coins: 0, currentQuestId: null, completedQuestIds: [], finishedAt: null, questProgress: null,
  }));
await expect('CANNOT start a team mid-race with progress already on it', false, () =>
  setDoc(doc(db, 'teams', id('cheatteam')), {
    name: 'Head start', color: '#111', gameId: GAME, memberIds: [OUTSIDER],
    coins: 0, currentQuestId: null, completedQuestIds: [QUEST], finishedAt: null, questProgress: null,
  }));
await expect('joins an existing team by adding only themselves', true, () =>
  updateDoc(doc(db, 'teams', TEAM_B), { memberIds: [people.playerB.uid, OUTSIDER] }));
await expect('CANNOT add somebody else to a team', false, () =>
  updateDoc(doc(db, 'teams', TEAM_A), { memberIds: [people.playerA.uid, people.mateA.uid, people.playerB.uid] }));
await expect('CANNOT rename a team while joining it', false, () =>
  updateDoc(doc(db, 'teams', TEAM_A), { memberIds: [people.playerA.uid, people.mateA.uid, OUTSIDER], name: 'hax' }));
await expect('leaves a team by removing only themselves', true, () =>
  updateDoc(doc(db, 'teams', TEAM_B), { memberIds: [people.playerB.uid] }));
await expect('CANNOT remove somebody else from a team', false, () =>
  updateDoc(doc(db, 'teams', TEAM_B), { memberIds: [] }));
await expect("CANNOT clear another player's position", false, () =>
  updateDoc(doc(db, 'games', GAME, 'players', people.playerA.uid), { lastLocation: null }));
await expect('leaves the game (deletes own membership)', true, () =>
  deleteDoc(doc(db, 'games', GAME, 'players', OUTSIDER)));

// ── account deletion: a person can erase themselves, and only themselves ───
group('account deletion');
await as('mateA');
const MATE = people.mateA.uid;
await seed(`trail/own_${tag}`, { userId: S(MATE), teamId: S(TEAM_A), gameId: S(GAME), lat: { doubleValue: 1 }, lng: { doubleValue: 2 }, t: I(1) });
await seed(`games/${GAME}/messages/mine_${tag}`, { teamId: S(TEAM_A), authorId: S(MATE), authorName: S('Mate'), fromHost: B(false), text: S('mine'), sentAt: I(9) });
await expect('reads their own trail points', true, async () =>
  (await getDocs(query(collection(db, 'trail'), where('userId', '==', MATE)))).docs.length);
await expect("CANNOT delete someone else's trail point", false, () => deleteDoc(doc(db, 'trail', `tr1_${tag}`)));
await expect("CANNOT read someone else's trail", false, async () =>
  (await getDocs(query(collection(db, 'trail'), where('userId', '==', people.playerA.uid)))).docs.length);
await expect('deletes their own trail point', true, () => deleteDoc(doc(db, 'trail', `own_${tag}`)));
await expect('deletes their own chat message', true, () => deleteDoc(doc(db, 'games', GAME, 'messages', `mine_${tag}`)));
await expect("CANNOT delete someone else's chat message", false, () => deleteDoc(doc(db, 'games', GAME, 'messages', 'mA')));
await expect('takes themselves off their team', true, () =>
  updateDoc(doc(db, 'teams', TEAM_A), { memberIds: [people.playerA.uid] }));
await expect("CANNOT delete another person's profile", false, () => deleteDoc(doc(db, 'users', people.playerB.uid)));
await expect('deletes their own profile', true, () => deleteDoc(doc(db, 'users', MATE)));

group('rival team');
await as('playerB');
await expect("cannot read team A's private entries", false, async () =>
  (await getDocs(query(activity, where('teamId', '==', TEAM_A), orderBy('at', 'desc')))).docs.length);
await expect("cannot read team A's chat", false, async () =>
  (await getDocs(query(messages, where('teamId', '==', TEAM_A), orderBy('sentAt')))).docs.length);
await expect('can read the public board', true, async () =>
  (await getDocs(query(activity, where('visibility', '==', 'public'), orderBy('at', 'desc')))).docs.length);

// ── hosts run their own game, and only theirs ───────────────────────────────
group('host');
await as('host');
await expect('edits their game', true, () => updateDoc(doc(db, 'games', GAME), { name: 'Renamed by host' }));
await expect('writes a quest', true, () => setDoc(doc(db, 'games', GAME, 'quests', QUEST), { title: 'Q1', isActive: true }));
await expect('edits a team in their game', true, () => updateDoc(doc(db, 'teams', TEAM_A), { name: 'Team A' }));
await expect('moves a team (per-team controls)', true, () => updateDoc(doc(db, 'teams', TEAM_A), { currentQuestId: QUEST, questProgress: null, finishedAt: null }));
await expect('logs an intervention', true, () => addDoc(activity, { type: 'admin_marked_solved', at: Date.now(), visibility: 'team', teamId: TEAM_A, teamName: 'Team A', questTitle: 'Q1' }));
await expect('posts a note', true, () => addDoc(activity, { type: 'admin_note', at: Date.now(), visibility: 'public', teamId: null, teamName: null, text: 'Bonus at the fountain' }));
await expect('adjusts coins and writes the ledger', true, async () => {
  await updateDoc(doc(db, 'teams', TEAM_A), { coins: 30 });
  return addDoc(collection(db, 'teams', TEAM_A, 'coinLedger'), { delta: 20, reason: 'side challenge', balanceAfter: 30, byName: 'host', at: Date.now() });
});
await expect('reads every chat thread', true, async () => (await getDocs(query(messages, orderBy('sentAt')))).docs.length);
await expect('reads wrong answers', true, async () => (await getDocs(attempts)).docs.length);
await expect('reads the whole board', true, async () => (await getDocs(query(activity, orderBy('at', 'desc')))).docs.length);
await expect('replies in chat', true, () => addDoc(messages, { teamId: TEAM_A, authorId: people.host.uid, authorName: 'host', fromHost: true, text: 'on our way', sentAt: Date.now() }));
await expect('marks a thread read', true, () => updateDoc(doc(db, 'teams', TEAM_A), { hostChatReadAt: Date.now() }));
await expect('reads the trail of their game', true, async () =>
  (await getDocs(query(collection(db, 'trail'), where('gameId', '==', GAME)))).docs.length);
await expect('deletes trail points in their game (reset)', true, () => deleteDoc(doc(db, 'trail', `tr1_${tag}`)));
await expect("CANNOT rename a player in their game", false, () =>
  updateDoc(doc(db, 'games', GAME, 'players', people.playerA.uid), { name: 'hax' }));
await expect('clears the chat (reset)', true, async () => {
  const snap = await getDocs(messages);
  for (const d of snap.docs) await deleteDoc(d.ref);
  return true;
});
await expect('CANNOT delete trail points of a game it does not host', false, () => deleteDoc(doc(db, 'trail', `legacy_${tag}`)));
await expect('CANNOT touch a game with no hostIds', false, () => updateDoc(doc(db, 'games', GAME_NO_HOSTS), { name: 'hax' }));
await expect('CANNOT write a quest in a game it does not host', false, () => setDoc(doc(db, 'games', GAME_NO_HOSTS, 'quests', 'q1'), { title: 'hax' }));
await expect('CANNOT read the player list', false, async () => (await getDocs(collection(db, 'users'))).docs.length);

group('outsider');
await as('outsider');
await expect('cannot edit a game', false, () => updateDoc(doc(db, 'games', GAME), { name: 'hax' }));
await expect('cannot edit a team', false, () => updateDoc(doc(db, 'teams', TEAM_A), { name: 'hax' }));
await expect('cannot make itself a host', false, () => updateDoc(doc(db, 'games', GAME), { hostIds: [people.outsider.uid] }));
await expect('cannot write a board entry', false, () => addDoc(activity, { type: 'quest_solved', at: Date.now(), visibility: 'public', teamId: TEAM_A, teamName: 'Team A' }));

group('platform admin');
await as('admin');
await expect('runs a game with no hostIds', true, () => updateDoc(doc(db, 'games', GAME_NO_HOSTS), { name: 'Admin can' }));
await expect('grants hosting', true, () => updateDoc(doc(db, 'games', GAME_NO_HOSTS), { hostIds: [people.host.uid] }));
await expect('reads the player list', true, async () => (await getDocs(collection(db, 'users'))).docs.length);
await expect('reads a sparse profile', true, () => getDoc(doc(db, 'users', people.playerA.uid)));

// ── positions and push tokens: the player and their hosts, nobody else ────
group('private entries');
const priv = uid => doc(db, 'games', GAME, 'private', uid);
const HERE = { lat: 1, lng: 2, updatedAt: Date.now() };
await as('playerA');
await expect('saves their position privately', true, () => setDoc(priv(people.playerA.uid), { lastLocation: HERE }, { merge: true }));
await expect('saves their push token privately', true, () => setDoc(priv(people.playerA.uid), { pushToken: 'ExponentPushToken[a]' }, { merge: true }));
await expect('reads their own private entry', true, () => getDoc(priv(people.playerA.uid)));
await expect('CANNOT put anything else in it', false, () => setDoc(priv(people.playerA.uid), { name: 'hax' }, { merge: true }));
await expect("CANNOT write somebody else's", false, () => setDoc(priv(people.mateA.uid), { lastLocation: HERE }));
await expect('CANNOT put a position on the player list', false, () =>
  updateDoc(doc(db, 'games', GAME, 'players', people.playerA.uid), { lastLocation: HERE }));
await expect('CANNOT put a push token on the player list', false, () =>
  updateDoc(doc(db, 'games', GAME, 'players', people.playerA.uid), { pushToken: 'ExponentPushToken[a]' }));
await as('mateA');
await expect("CANNOT read a teammate's private entry", false, () => getDoc(priv(people.playerA.uid)));
await expect('CANNOT list private entries', false, async () => (await getDocs(collection(db, 'games', GAME, 'private'))).docs.length);
await as('playerB');
await expect("CANNOT read a rival's private entry", false, () => getDoc(priv(people.playerA.uid)));
await as('host');
await expect('reads every private entry in their game', true, async () => (await getDocs(collection(db, 'games', GAME, 'private'))).docs.length);
await expect('clears a position (reset)', true, () => updateDoc(priv(people.playerA.uid), { lastLocation: deleteField() }));
await expect("CANNOT change a player's push token", false, () => updateDoc(priv(people.playerA.uid), { pushToken: 'ExponentPushToken[hax]' }));
await as('playerA');
await expect('deletes their private entry (leaving, account deletion)', true, () => deleteDoc(priv(people.playerA.uid)));

// ── items: a team buys for itself; curses and robberies come from the server ─
group('items');
await as('playerA');
await expect('buys a radar for the team', true, () => updateDoc(doc(db, 'teams', TEAM_A), { activeRadarUntil: Date.now() + 300000, coins: 5 }));
await expect('buys a shield for the team', true, () => updateDoc(doc(db, 'teams', TEAM_A), { shields: 1 }));
await expect('CANNOT curse a team by writing to it', false, () => updateDoc(doc(db, 'teams', TEAM_B), { cursedUntil: Date.now() + 120000 }));
await expect('CANNOT lift its own curse', false, () => updateDoc(doc(db, 'teams', TEAM_A), { cursedUntil: 0 }));
await expect('CANNOT reset its robbery cooldown', false, () => updateDoc(doc(db, 'teams', TEAM_A), { robbedAt: 0 }));
await expect("CANNOT give itself another team's coins", false, () => updateDoc(doc(db, 'teams', TEAM_B), { coins: 0 }));

// ── hosts move players between teams on the Teams page ────────────────────
group('moving players');
const MOVER = id('mover');
await seed(`users/${MOVER}`, { name: S('Mover'), email: S('m@test.dev'), isAdmin: B(false), gameId: S(GAME), teamId: S(TEAM_A) });
await seed(`users/${id('elsewhere')}`, { name: S('Elsewhere'), email: S('e@test.dev'), isAdmin: B(false), gameId: S(id('nevers')), teamId: { nullValue: null } });
await as('host');
await expect("moves a player of their game to another team", true, () => updateDoc(doc(db, 'users', MOVER), { teamId: TEAM_B }));
await expect("takes a player of their game off any team", true, () => updateDoc(doc(db, 'users', MOVER), { teamId: null }));
await expect("CANNOT change anything else on the profile", false, () => updateDoc(doc(db, 'users', MOVER), { name: 'renamed' }));
await expect("CANNOT move a player of another game", false, () => updateDoc(doc(db, 'users', id('elsewhere')), { teamId: TEAM_B }));
await as('playerB');
await expect("a player CANNOT move someone else", false, () => updateDoc(doc(db, 'users', MOVER), { teamId: TEAM_B }));

// ── a phone that was offline can't set its team back ──────────────────────
group('no going back');
const TEAM_C = id('teamC');
await seed(`teams/${TEAM_C}`, {
  name: S('Team C'), gameId: S(GAME), memberIds: ARR([S(people.playerB.uid)]),
  currentQuestId: S('q3'), completedQuestIds: ARR([S(QUEST), S('q2')]), coins: I(10), finishedAt: { nullValue: null },
});
await as('playerB');
await expect('CANNOT set the team back to a solved quest', false, () =>
  updateDoc(doc(db, 'teams', TEAM_C), { currentQuestId: 'q2', completedQuestIds: [QUEST, 'q2'], questProgress: null, coins: 20 }));
await expect('solves the quest it is on', true, () =>
  updateDoc(doc(db, 'teams', TEAM_C), { currentQuestId: 'q4', completedQuestIds: [QUEST, 'q2', 'q3'], questProgress: null, coins: 20 }));
await expect('buys a hint on a quest the host moved it back to', true, () =>
  updateDoc(doc(db, 'teams', TEAM_C), { coins: 5 }));
await as('host');
await expect('a host can still move a team back', true, () => updateDoc(doc(db, 'teams', TEAM_C), { currentQuestId: 'q2' }));
await as('playerB');
await expect('after a move back, buys a hint there', true, () => updateDoc(doc(db, 'teams', TEAM_C), { coins: 4 }));

// ── finishing records the pause total, for the team's race time ───────────
group('race time');
await as('playerA');
await expect('records the pause total when finishing', true, () =>
  updateDoc(doc(db, 'teams', TEAM_A), { finishedAt: Date.now(), pausedMsAtFinish: 0, currentQuestId: null }));

// ── the recap: hosts build it, players see it once a host shows it ─────────
group('recap');
const recap = g => doc(db, 'games', g, 'recap', 'summary');
await as('host');
await expect('builds the recap of their game', true, () => setDoc(recap(GAME), { version: 1, builtAt: 1, publishedAt: null }));
await expect('reads it before players can', true, () => getDoc(recap(GAME)));
await expect('CANNOT build one for a game it does not host', false, () => setDoc(recap(id('nevers')), { version: 1, builtAt: 1, publishedAt: null }));
await as('playerA');
await expect('CANNOT read it before a host shows it', false, () => getDoc(recap(GAME)));
await expect('CANNOT write it', false, () => setDoc(recap(GAME), { version: 1, builtAt: 2, publishedAt: 2 }));
await as('host');
await expect('shows it to players', true, () => updateDoc(recap(GAME), { publishedAt: 5 }));
await expect('flags it on the game for the app', true, () => updateDoc(doc(db, 'games', GAME), { recapPublishedAt: 5 }));
await as('playerA');
await expect('reads it once shown', true, () => getDoc(recap(GAME)));
await expect('CANNOT hide it again', false, () => updateDoc(recap(GAME), { publishedAt: null }));
await expect('CANNOT flag it on the game', false, () => updateDoc(doc(db, 'games', GAME), { recapPublishedAt: null }));
await as('playerB');
await expect('CANNOT read it without having joined the game', false, () => getDoc(recap(GAME)));

// ── app settings: the oldest app version let in ─────────────────────────────
group('app settings');
const appSettings = doc(db, 'settings', 'app');
await as('admin');
await expect('an admin sets the oldest app version', true, () => setDoc(appSettings, { minClientVersion: 1 }));
await as('host');
await expect('CANNOT set it as a host', false, () => setDoc(appSettings, { minClientVersion: 9 }));
await signOut(auth);
await expect('read before signing in', true, () => getDoc(appSettings));

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
