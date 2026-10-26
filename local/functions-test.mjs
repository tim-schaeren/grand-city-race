// Plays a race end to end through the server functions, against the emulators:
//   npm run build --workspace=apps/functions
//   firebase emulators:start --only auth,firestore,functions --project demo-gcr
//   node local/functions-test.mjs
// Seeds its own game, so it needs nothing else and can run again.

const PROJECT = process.env.PROJECT ?? 'demo-gcr';
const FUNCTIONS = `http://127.0.0.1:5001/${PROJECT}/europe-west1`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const AUTH_ADMIN = `${AUTH}/projects/${PROJECT}`;
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

// ── Plumbing ──────────────────────────────────────────────────────────────

function value(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, value(x)])) } };
}
function plain(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(plain);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)]));
  return undefined;
}
async function seed(path, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]));
  const res = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`seed ${path}: ${await res.text()}`);
}
async function read(path) {
  const res = await fetch(`${FS}/${path}`, { headers: OWNER });
  if (!res.ok) return null;
  return plain({ mapValue: await res.json() });
}
async function list(path) {
  const res = await (await fetch(`${FS}/${path}?pageSize=300`, { headers: OWNER })).json();
  return (res.documents ?? []).map(d => ({ id: d.name.split('/').pop(), ...plain({ mapValue: d }) }));
}

async function signUp(name, { admin = false } = {}) {
  const email = `${name.toLowerCase()}${tag}@test.dev`;
  const r = await (await fetch(`${AUTH}/accounts:signUp?key=x`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'pw1234', returnSecureToken: true }),
  })).json();
  await seed(`users/${r.localId}`, { name, email, createdAt: 1 });
  if (admin) {
    await fetch(`${AUTH_ADMIN}/accounts:update`, {
      method: 'POST', headers: OWNER,
      body: JSON.stringify({ localId: r.localId, customAttributes: JSON.stringify({ admin: true }) }),
    });
  }
  // Signed in again, so the token carries the claim
  const s = await (await fetch(`${AUTH}/accounts:signInWithPassword?key=x`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'pw1234', returnSecureToken: true }),
  })).json();
  return { name, email, uid: r.localId, token: s.idToken };
}

// A callable function, as the apps call it. Resolves to { result } or { error }.
async function call(fn, who, data) {
  const res = await fetch(`${FUNCTIONS}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${who.token}` } : {}) },
    body: JSON.stringify({ data }),
  });
  const body = await res.json().catch(() => ({}));
  return body.error ? { error: body.error.message } : { result: body.result };
}

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n      ${JSON.stringify(detail)}`}`);
}
const refused = (r, message) => !!r.error && (!message || r.error === message);
const wait = ms => new Promise(r => setTimeout(r, ms));
let requests = 0;
const req = () => `r${tag}_${++requests}`;

// ── The game ──────────────────────────────────────────────────────────────

const tag = Date.now();
const GAME = `game${tag}`;
const PLACE = { lat: 46.948, lng: 7.4474 };
const FAR = { lat: 46.96, lng: 7.47 };

const host = await signUp('Sherlock');
const ann = await signUp('Ann');
const ben = await signUp('Ben');
const cat = await signUp('Cat');
const dan = await signUp('Dan');
const admin = await signUp('Admin', { admin: true });

await seed(`games/${GAME}`, {
  name: 'Test race', city: 'Bern', cityCoordinates: PLACE, hostIds: [host.uid], joinCode: 'TST' + String(tag).slice(-3).replace(/[01]/g, '7'),
  questOrder: ['q1', 'q2', 'q3', 'q4'], startDateTime: Date.now() - 60000, pausedAt: null, endedAt: null, totalPausedMs: 0,
  maxTeamSize: 2, startingCoins: 30, coinsPerQuest: 10, hintCost: 5,
  shop: { shield: { enabled: true, price: 5 }, curse: { enabled: true, price: 5, durationMinutes: 1 }, compass: { enabled: true, price: 5, durationMinutes: 5 } },
});
const code = (await read(`games/${GAME}`)).joinCode;
await seed(`games/${GAME}/quests/q1`, {
  title: 'The bear pit', trigger: 'location', task: 'answer', location: PLACE, fenceRadius: 40,
  navigationHint: [{ type: 'text', text: 'Find the bears' }], description: [{ type: 'text', text: 'How many bears?' }],
  answers: ['Seven', '7'], hints: [{ blocks: [{ type: 'text', text: 'Count them' }] }, { blocks: [{ type: 'text', text: 'More than six' }] }],
});
await seed(`games/${GAME}/quests/q2`, {
  title: 'Walk on', trigger: 'distance', task: 'continue', distanceMeters: 60,
  navigationHint: [], description: [{ type: 'text', text: 'Well walked' }],
});
await seed(`games/${GAME}/quests/q3`, {
  title: 'Break', trigger: 'none', task: 'timer', durationSeconds: 2, navigationHint: [], description: [],
});
await seed(`games/${GAME}/quests/q4`, {
  title: 'Last one', trigger: 'none', task: 'answer', answers: ['done'], navigationHint: [], description: [],
});
const state = teamId => read(`games/${GAME}/teams/${teamId}/private/state`);
const team = teamId => read(`games/${GAME}/teams/${teamId}`);
const play = (who, action, data = {}) => call('play', who, { action, gameId: GAME, requestId: req(), ...data });
const hostDo = (who, action, data = {}) => call('host', who, { action, gameId: GAME, ...data });

// ── Joining ───────────────────────────────────────────────────────────────

check('no sign-in is refused', refused(await call('play', null, { action: 'sync', gameId: GAME })));
check('a wrong code finds no game', refused(await call('play', ann, { action: 'joinGame', code: 'ZZZZZZ' })));
const joined = await call('play', ann, { action: 'joinGame', code });
check('joins with the invite code', joined.result?.gameId === GAME, joined);
await call('play', ben, { action: 'joinGame', code });
await call('play', cat, { action: 'joinGame', code });
check('Ann is on the player list, without a team', (await read(`games/${GAME}/players/${ann.uid}`))?.teamId === null);
check('a team needs a colour from the palette', refused(await play(ann, 'createTeam', { name: 'Bears', color: '#123456' })));
const created = await play(ann, 'createTeam', { name: 'Bears', color: '#e11d48' });
const TA = created.result?.teamId;
check('starts a team', !!TA, created);
check("the team has the game's starting coins", (await state(TA))?.coins === 30);
check('joining a team from outside the game is refused', refused(await play(dan, 'joinTeam', { teamId: TA })));
check('Ben joins the team', !!(await play(ben, 'joinTeam', { teamId: TA })).result);
await call('play', dan, { action: 'joinGame', code });
check('a full team takes no one else', refused(await play(dan, 'joinTeam', { teamId: TA })));
const TB = (await play(cat, 'createTeam', { name: 'Owls', color: '#2563eb' })).result?.teamId;
check('member lists and player list agree', JSON.stringify((await team(TA)).memberIds.sort()) === JSON.stringify([ann.uid, ben.uid].sort())
  && (await read(`games/${GAME}/players/${ben.uid}`)).teamId === TA);

// ── The first quest: at a place, with an answer ───────────────────────────

const synced = await play(ann, 'sync');
check('sync answers with the server time', typeof synced.result?.serverTime === 'number', synced);
let s = await state(TA);
check('the team is on the first quest', s.quest?.questId === 'q1');
check('before arriving: no title, no text, no answers', !s.quest.title && !s.quest.description && !('answers' in s.quest));
check('it knows the place, for fence, compass and radar', s.quest.location?.lat === PLACE.lat);
check('unlocking from far away is refused', refused(await play(ann, 'unlock', { questId: 'q1', ...FAR })));
check('answering from far away is refused', refused(await play(ann, 'answer', { questId: 'q1', text: 'seven', ...FAR })));
check('unlocks at the place', (await play(ann, 'unlock', { questId: 'q1', ...PLACE })).result?.unlocked === true);
s = await state(TA);
check('now the title and text arrive', s.quest.title === 'The bear pit' && s.quest.description?.length === 1);

const hintReq = req();
const hint = await call('play', ann, { action: 'revealHint', gameId: GAME, questId: 'q1', index: 1, requestId: hintReq });
check('buys the first hint', hint.result?.revealed === 1, hint);
await call('play', ann, { action: 'revealHint', gameId: GAME, questId: 'q1', index: 1, requestId: hintReq });
check('the same request again pays nothing', (await state(TA)).coins === 25);
await play(ben, 'revealHint', { questId: 'q1', index: 1 });
check('a teammate tapping the same hint pays nothing', (await state(TA)).coins === 25);
s = await state(TA);
check('the paid hint is in the view, the next one is not', s.quest.hints.length === 1 && s.quest.hintCount === 2);
check('skipping a hint is refused', refused(await play(ann, 'revealHint', { questId: 'q1', index: 3 })));

const wrong = await play(ann, 'answer', { questId: 'q1', text: 'six', ...PLACE });
check('a wrong answer', wrong.result?.correct === false, wrong);
check('is recorded for the hosts', (await list(`games/${GAME}/attempts`)).some(a => a.text === 'six' && a.teamId === TA));
const right = await play(ann, 'answer', { questId: 'q1', text: '  SEVEN ', ...PLACE });
check('the right answer, whatever the capitals and spaces', right.result?.correct === true, right);
s = await state(TA);
check('paid, and on to the second quest', s.coins === 35 && s.currentQuestId === 'q2' && s.quest?.questId === 'q2');
check('solved count goes up for everyone to see', (await team(TA)).solvedCount === 1);
check('the board says so, without the title', (await list(`games/${GAME}/activity`)).some(e => e.type === 'quest_solved' && e.teamId === TA && e.questNumber === 1 && !e.questTitle));
check("Ben's old answer to the first quest is refused", refused(await play(ben, 'answer', { questId: 'q1', text: 'seven', ...PLACE }), 'Your team has already moved on from this quest'));

// ── The second quest: a distance, then continue ───────────────────────────

const partway = await play(ann, 'reportDistance', { questId: 'q2', meters: 30 });
check('part of the distance', partway.result?.unlocked === false && partway.result.walkedMeters === 30, partway);
check('a shorter report from a teammate takes nothing away', (await play(ben, 'reportDistance', { questId: 'q2', meters: 10 })).result?.walkedMeters === 30);
const walked = await play(ann, 'reportDistance', { questId: 'q2', meters: 5000 });
check('any way of covering it counts, a train too', walked.result?.unlocked === true, walked);
check('continue moves on', (await play(ann, 'continueQuest', { questId: 'q2' })).result?.solved === true);

// ── The third quest: a timer ──────────────────────────────────────────────

check('the timer starts on arrival', !!(await state(TA)).quest?.unlockedAt);
check('continuing before the time is up is refused', refused(await play(ann, 'continueQuest', { questId: 'q3' }), 'The time isn’t up yet'));
await wait(2100);
check('after the time is up it moves on', (await play(ann, 'continueQuest', { questId: 'q3' })).result?.solved === true);

// ── Items ─────────────────────────────────────────────────────────────────

check('the compass has nothing to point at on this quest', refused(await play(ann, 'buyItem', { item: 'compass' })));
check('buys a shield', (await play(ann, 'buyItem', { item: 'shield' })).result?.bought === 'shield');
check('Owls see Bears in the standings but not their shield', !('shields' in (await team(TA))));
await call('play', cat, { action: 'sync', gameId: GAME });
const blocked = await play(cat, 'useItem', { item: 'curse', targetTeamId: TA });
check('the shield blocks a curse', blocked.result?.outcome === 'blocked', blocked);
check('and is used up', (await state(TA)).shields === 0);
check('a curse lands', (await play(cat, 'useItem', { item: 'curse', targetTeamId: TA })).result?.outcome === 'cursed');
check('a cursed team cannot answer', refused(await play(ann, 'answer', { questId: 'q4', text: 'done' }), 'You’re cursed'));

// ── Hosts ─────────────────────────────────────────────────────────────────

check('a player cannot pause the race', refused(await hostDo(ann, 'pause')));
check('the host pauses', !!(await hostDo(host, 'pause')).result);
check('nothing moves while paused', refused(await play(cat, 'buyItem', { item: 'shield' }), 'The game is paused'));
check('the host resumes', !!(await hostDo(host, 'resume')).result);
check('the pause is counted', (await read(`games/${GAME}`)).totalPausedMs > 0);
const adjusted = await hostDo(host, 'adjustCoins', { teamId: TB, delta: 15, reason: 'Found a bug' });
check('the host adds coins, with a reason on record', typeof adjusted.result?.balanceAfter === 'number'
  && (await list(`games/${GAME}/teams/${TB}/coinLedger`)).some(l => l.reason === 'Found a bug'), adjusted);

// A flash sale: the price at the moment of buying, back to normal once it ends
const setSale = sale => fetch(`${FS}/games/${GAME}?updateMask.fieldPaths=shop.shield.sale`, {
  method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: { shop: value({ shield: { sale } }) } }),
});
await setSale({ percent: 60, until: Date.now() + 60_000 });
let coinsBefore = (await state(TB)).coins;
check('a shield on sale costs 60% less', !!(await play(cat, 'buyItem', { item: 'shield' })).result && coinsBefore - (await state(TB)).coins === 2);
await setSale({ percent: 60, until: Date.now() - 1000 });
coinsBefore = (await state(TB)).coins;
check('and full price once the sale is over', !!(await play(cat, 'buyItem', { item: 'shield' })).result && coinsBefore - (await state(TB)).coins === 5);

// A quest edited mid-race: the team on it sees the change, marked, and the hosts have it on record
await seed(`games/${GAME}/quests/q4`, {
  title: 'Last one', trigger: 'none', task: 'answer', answers: ['done'], navigationHint: [], description: [{ type: 'text', text: 'Type done' }],
});
await wait(2000);
s = await state(TA);
check('an edit mid-race reaches the team on the quest, marked as edited', s.quest?.description?.[0]?.text === 'Type done' && s.quest.editedAt > 0);
check('and goes on the hosts\' record, hidden from players', (await list(`games/${GAME}/activity`)).some(e => e.type === 'quest_edited' && e.questId === 'q4' && e.visibility === 'hosts'));
check('the host moves Dan onto Owls', !!(await hostDo(host, 'movePlayer', { uid: dan.uid, teamId: TB })).result
  && (await team(TB)).memberIds.includes(dan.uid));
check('the host marks the last quest solved for Bears', !!(await hostDo(host, 'teamProgress', { teamId: TA, type: 'solve', questId: 'q4' })).result);
check('Bears have finished, first', !!(await team(TA)).finishedAt
  && (await list(`games/${GAME}/activity`)).some(e => e.type === 'team_finished' && e.teamId === TA && e.placement === 1));
check('the host unfinishes them', !!(await hostDo(host, 'teamProgress', { teamId: TA, type: 'unfinish' })).result
  && !(await team(TA)).finishedAt);
// Deleting a quest mid-race: the teams on it move on, or finish if it was the last
await hostDo(host, 'teamProgress', { teamId: TB, type: 'move', questId: 'q3' });
await hostDo(host, 'teamProgress', { teamId: TA, type: 'move', questId: 'q4' });
check('a player cannot delete a quest', refused(await hostDo(ann, 'deleteQuest', { questId: 'q3' })));
check('the host deletes the quest Owls are on', !!(await hostDo(host, 'deleteQuest', { questId: 'q3' })).result
  && !(await read(`games/${GAME}/quests/q3`)) && !(await read(`games/${GAME}`)).questOrder.includes('q3'));
s = await state(TB);
check('Owls are moved on to the next quest', s.currentQuestId === 'q4' && s.quest?.questId === 'q4', s);
check('Bears, on the last quest, stay put meanwhile', (await state(TA)).currentQuestId === 'q4');
check('deleting the last quest finishes the teams on it', !!(await hostDo(host, 'deleteQuest', { questId: 'q4' })).result
  && !!(await team(TA)).finishedAt && !!(await team(TB)).finishedAt && (await state(TA)).currentQuestId === null);
const added = await hostDo(host, 'hosts', { do: 'add', email: cat.email.toUpperCase() });
check('the host adds a co-host by email', added.result?.hosts?.length === 2, added);
check('and removes them again', (await hostDo(host, 'hosts', { do: 'remove', uid: cat.uid })).result?.hosts?.length === 1);
check('a game keeps its last host', refused(await hostDo(host, 'hosts', { do: 'remove', uid: host.uid }), 'A game needs at least one host'));
check('the host builds the recap', !!(await hostDo(host, 'recap', { do: 'build' })).result && !!(await read(`games/${GAME}/recap/summary`)));
check('the host ends the race', !!(await hostDo(host, 'end')).result);
check('nothing moves once it is over', refused(await play(cat, 'buyItem', { item: 'shield' }), 'The game is over'));
check('a reset needs a new start in the future', refused(await hostDo(host, 'reset', { startDateTime: Date.now() - 1000 })));
const newStart = Date.now() + 86_400_000;
check('the host resets it, with a new start', !!(await hostDo(host, 'reset', { startDateTime: newStart })).result);
check('so the race waits for its new start', (await read(`games/${GAME}`)).startDateTime === newStart && !(await read(`games/${GAME}`)).endedAt);
s = await state(TA);
check('back to the start, players still in their teams', s.coins === 30 && s.completedQuestIds.length === 0 && !s.quest
  && (await team(TA)).memberIds.length === 2 && (await list(`games/${GAME}/activity`)).length === 0);

// ── Leaving, and deleting accounts ────────────────────────────────────────

check('Ben leaves the game', !!(await play(ben, 'leaveGame')).result && !(await read(`games/${GAME}/players/${ben.uid}`))
  && !(await team(TA)).memberIds.includes(ben.uid));
await seed(`games/${GAME}/messages/m${tag}`, { teamId: TB, authorId: dan.uid, authorName: 'Dan', fromHost: false, text: 'hi', sentAt: 1 });
await seed(`games/${GAME}/trail/t${tag}`, { uid: dan.uid, teamId: TB, lat: 1, lng: 2, t: 1 });
check('a player cannot delete other accounts', refused(await call('admin', ann, { action: 'deleteUser', uid: dan.uid })));
check('an admin deletes an account', (await call('admin', admin, { action: 'deleteUser', uid: dan.uid })).result?.deleted === true);
check('everything of theirs is gone, their team stays', !(await read(`users/${dan.uid}`)) && !(await read(`games/${GAME}/players/${dan.uid}`))
  && !(await read(`games/${GAME}/messages/m${tag}`)) && !(await read(`games/${GAME}/trail/t${tag}`))
  && !(await team(TB)).memberIds.includes(dan.uid));
check('a player deletes their own account', (await play(cat, 'deleteAccount')).result?.deleted === true && !(await read(`users/${cat.uid}`)));
check('the host deletes the game and everything in it', !!(await hostDo(host, 'deleteGame')).result
  && !(await read(`games/${GAME}`)) && (await list(`games/${GAME}/quests`)).length === 0);

// ── A test run, before the race ───────────────────────────────────────────

const PRE = `pre${tag}`;
await seed(`games/${PRE}`, {
  name: 'Next race', city: 'Bern', cityCoordinates: PLACE, hostIds: [host.uid], joinCode: 'PRE' + String(tag).slice(-3).replace(/[01]/g, '7'),
  questOrder: ['p1', 'p2'], startDateTime: Date.now() + 86_400_000, pausedAt: null, endedAt: null, totalPausedMs: 0,
  startingCoins: 20, coinsPerQuest: 10, hintCost: 5,
  shop: { curse: { enabled: true, price: 5, durationMinutes: 1 }, robbery: { enabled: true, price: 5, percent: 50, cap: 100, durationMinutes: 15 } },
});
await seed(`games/${PRE}/quests/p1`, {
  title: 'First', trigger: 'location', task: 'answer', location: PLACE, fenceRadius: 40,
  navigationHint: [{ type: 'text', text: 'Go' }], description: [{ type: 'text', text: 'Say yes' }], answers: ['yes'],
});
await seed(`games/${PRE}/quests/p2`, {
  title: 'Second', trigger: 'none', task: 'continue', navigationHint: [], description: [{ type: 'text', text: 'Done' }],
});
const preHost = (action, data = {}) => call('host', host, { action, gameId: PRE, ...data });
const prePlay = (who, action, data = {}) => call('play', who, { action, gameId: PRE, requestId: req(), ...data });
const testState = () => read(`games/${PRE}/teams/test/private/state`);

check('a player cannot open a test run', refused(await call('host', ann, { action: 'testRun', gameId: PRE, type: 'open' })));
const opened = await preHost('testRun', { type: 'open' });
check('the host opens a test run, with a link code', typeof opened.result?.code === 'string' && opened.result.code.length >= 8, opened);
check('both test teams are made, marked as tests', (await read(`games/${PRE}/teams/test`))?.test === true
  && (await read(`games/${PRE}/teams/test-rival`))?.test === true);
check("a wrong code doesn't join", refused(await call('play', ann, { action: 'joinTest', gameId: PRE, code: 'nope1234' })));
check('the link puts Ann on the test team', (await call('play', ann, { action: 'joinTest', gameId: PRE, code: opened.result.code })).result?.teamId === 'test'
  && (await read(`games/${PRE}/teams/test`)).memberIds.includes(ann.uid));
await prePlay(ann, 'sync');
check('the test team plays before the start', (await testState()).quest?.questId === 'p1');
check('it can unlock and answer', !!(await prePlay(ann, 'unlock', { questId: 'p1', ...PLACE })).result
  && (await prePlay(ann, 'answer', { questId: 'p1', text: 'yes', ...PLACE })).result?.correct === true);
check("its solve stays out of the race's feed", (await list(`games/${PRE}/activity`)).every(e => e.visibility === 'team'));
check('the host puts it back on quest 1', !!(await preHost('testRun', { type: 'move', questId: 'p1' })).result
  && (await testState()).quest?.questId === 'p1');
check('the host has it arrive', !!(await preHost('testRun', { type: 'arrive' })).result && !!(await testState()).quest?.unlockedAt);
check('the host gives it coins', !!(await preHost('adjustCoins', { teamId: 'test', delta: 50, reason: 'test' })).result
  && (await testState()).coins === 80);
check('the rival curses it', !!(await preHost('testRun', { type: 'curse' })).result && (await testState()).cursedUntil > Date.now());
check('and robs it', !!(await preHost('testRun', { type: 'robbery' })).result && (await testState()).coins === 40);
await seed(`games/${PRE}/teams/real`, { gameId: PRE, name: 'Real', color: '#e11d48', memberIds: [], solvedCount: 0, finishedAt: null });
await seed(`games/${PRE}/teams/real/private/state`, { gameId: PRE, teamId: 'real', coins: 20, currentQuestId: null, completedQuestIds: [], hintsRevealed: {}, quest: null });
check('starting over clears the curse and coins', !!(await preHost('testRun', { type: 'restart' })).result
  && (await testState()).coins === 20 && !(await testState()).cursedUntil);
check("the test team can't curse a real team", refused(await prePlay(ann, 'useItem', { item: 'curse', targetTeamId: 'real' }), 'In a test run, items work on the test rival only.'));
check('but it can curse the rival', !!(await prePlay(ann, 'useItem', { item: 'curse', targetTeamId: 'test-rival' })).result);
check("Ben, playing in the race, can't join the test", !!(await call('play', ben, { action: 'joinGame', code: (await read(`games/${PRE}`)).joinCode })).result
  && refused(await call('play', ben, { action: 'joinTest', gameId: PRE, code: opened.result.code })));
await seed(`games/${PRE}/quests/p3`, { title: 'Broken', trigger: 'none', task: 'answer', answers: [], navigationHint: [], description: [{ type: 'text', text: 'No answers' }] });
const setOrder = order => fetch(`${FS}/games/${PRE}?updateMask.fieldPaths=questOrder`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: { questOrder: value(order) } }) });
await setOrder(['p1', 'p2', 'p3']);
check('a race with a problem cannot be started', refused(await preHost('start')));
await wait(2000);
check('and is held, so it will not start by itself', (await read(`games/${PRE}`)).startHeld === true);
await setOrder(['p1', 'p2']);
await wait(2000);
check('fixed before its time, it is let go again', (await read(`games/${PRE}`)).startHeld === false);
check('the host starts the race', !!(await preHost('start')).result);
check('and the test run is gone', !(await read(`games/${PRE}/teams/test`)) && !(await read(`games/${PRE}/teams/test-rival`))
  && !(await read(`games/${PRE}/players/${ann.uid}`)) && (await list(`games/${PRE}/activity`)).every(e => e.teamId !== 'test' && e.targetTeamId !== 'test'));
check('no test run once the race runs', refused(await preHost('testRun', { type: 'open' }), 'A test run is for before the race starts.'));
await call('host', host, { action: 'deleteGame', gameId: PRE });

// A race whose time comes with a problem in it: held until the host starts it
const HELD = `held${tag}`;
await seed(`games/${HELD}/quests/h1`, { title: 'Broken', trigger: 'none', task: 'answer', answers: [], navigationHint: [], description: [{ type: 'text', text: 'No answers' }] });
await seed(`games/${HELD}`, {
  name: 'Held race', city: 'Bern', cityCoordinates: PLACE, hostIds: [host.uid], joinCode: 'HLD' + String(tag).slice(-3).replace(/[01]/g, '7'),
  questOrder: ['h1'], startDateTime: Date.now() + 3000, pausedAt: null, endedAt: null, totalPausedMs: 0,
});
const heldHost = (action, data = {}) => call('host', host, { action, gameId: HELD, ...data });
await wait(4000);
check('a race with a problem is held past its time', (await read(`games/${HELD}`)).startHeld === true
  && !!(await heldHost('testRun', { type: 'open' })).result);
await seed(`games/${HELD}/quests/h1`, { title: 'Fixed', trigger: 'none', task: 'answer', answers: ['yes'], navigationHint: [], description: [{ type: 'text', text: 'Say yes' }] });
await wait(2000);
check('fixed after its time, it still waits for the host', (await read(`games/${HELD}`)).startHeld === true);
check('the host starts it', !!(await heldHost('start')).result && (await read(`games/${HELD}`)).startHeld === false
  && refused(await heldHost('testRun', { type: 'open' })));
await heldHost('deleteGame');

console.log(`\n${results.filter(Boolean).length} of ${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
