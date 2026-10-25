// A believable race in Bern's old town, for store screenshots and demos.
// Run against the local emulator after seed-players.mjs:
//   node local/seed-demo.mjs
// Writes with the emulator's owner token, so rules don't apply. Safe to re-run:
// every document has a fixed id and is overwritten.

const PROJECT = 'gcr26-d76cc';
const FS = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = `http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

function value(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: fields(v) } };
}
function fields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, value(v)]));
}
async function put(path, data) {
  const res = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: fields(data) }) });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}

// Seeded players, by email
const res = await fetch(`${AUTH}/accounts:query`, { method: 'POST', headers: OWNER, body: '{}' });
const accounts = (await res.json()).userInfo ?? [];
const uid = email => {
  const a = accounts.find(u => u.email === email);
  if (!a) throw new Error(`No account for ${email} — run seed-players.mjs first`);
  return a.localId;
};
const P = {
  sherlock: uid('sherlock@221b.co.uk'),
  katniss: uid('katniss@district12.gov'),
  hermione: uid('hermione@hogwarts.ac.uk'),
  mac: uid('mac@phoenix.foundation'),
  tony: uid('tony@stark.industries'),
  walter: uid('walter@laundromat.com'),
  lara: uid('lara@tombraider.com'),
  jack: uid('captain@blackpearl.com'),
  indy: uid('indy@archaeology.edu'),
  ron: uid('ron@pawnee.gov'),
};
const NAMES = {
  sherlock: 'Sherlock Holmes', katniss: 'Katniss Everdeen', hermione: 'Hermione Granger',
  mac: 'MacGyver', tony: 'Tony Stark', walter: 'Walter White', lara: 'Lara Croft',
  jack: 'Jack Sparrow', indy: 'Indiana Jones', ron: 'Ron Swanson',
};

const GAME = 'demo-bern';
const now = Date.now();
const min = 60000;
const started = now - 95 * min;

const text = t => [{ type: 'text', text: t }];
const quests = [
  {
    id: 'q1', title: 'Time Keeper', trigger: 'location', task: 'answer',
    location: { lat: 46.94797, lng: 7.44795 }, fenceRadius: 40,
    navigationHint: text('Start where the city has told the time since 1405.'),
    description: text('Count the golden figures that parade before the hour strikes. How many are there?'),
    answers: ['5', 'five'], hints: [{ blocks: text('Look for the jester first.') }],
  },
  {
    id: 'q2', title: 'Arcade Walk', trigger: 'distance', task: 'continue', distanceMeters: 600,
    navigationHint: text('Walk the arcades down Kramgasse and count the fountains as you go.'),
    description: text('Six kilometres of arcades run through the old town. You just walked some of them.'),
  },
  {
    id: 'q3', title: 'The Tallest Tower', trigger: 'location', task: 'answer',
    location: { lat: 46.94706, lng: 7.45125 }, fenceRadius: 40,
    navigationHint: text('Find the tallest church tower in Switzerland. The last judgement waits above its door.'),
    description: text('Above the main portal, the righteous and the damned are carved in stone. How many figures stand in the portal?'),
    answers: ['234'], hints: [{ blocks: text('The number is written on the sign by the door.') }],
  },
  {
    id: 'q4', title: 'Bear Necessities', trigger: 'none', task: 'answer',
    description: text('Bern has kept bears since 1513. What are the two bears in the park called today?'),
    answers: ['finn and björk', 'björk and finn', 'finn & björk'],
    hints: [
      { blocks: text('One of them shares a name with an Icelandic singer.') },
      { blocks: text('The other one sounds like he came from Finland.') },
    ],
  },
  {
    id: 'q5', title: 'Rose Garden Break', trigger: 'none', task: 'timer', durationSeconds: 600,
    description: text('Catch your breath and enjoy the best view over the old town. Ten minutes, no running.'),
  },
  {
    id: 'q6', title: 'Federal Finale', trigger: 'location', task: 'continue',
    location: { lat: 46.94660, lng: 7.44410 }, fenceRadius: 60,
    navigationHint: text('End where the country is governed, in front of its domed house.'),
    description: text('You made it. Find your hosts on the square.'),
  },
];

await put(`games/${GAME}`, {
  name: 'Bern Old Town Race',
  startDateTime: started,
  city: 'Bern',
  cityCoordinates: { lat: 46.948, lng: 7.4474 },
  questOrder: quests.map(q => q.id),
  hostIds: [P.sherlock],
  joinCode: 'BEAR26',
  themeId: 'retro',
  hotlineNumber: '+41 31 000 00 00',
  maxTeamSize: 4,
  maxTeamSpreadMeters: null,
  startingCoins: 20,
  coinsPerQuest: 10,
  hintCost: 10,
  pausedAt: null,
  totalPausedMs: 0,
  endedAt: null,
});
for (const { id, ...q } of quests) await put(`games/${GAME}/quests/${id}`, { ...q, isActive: true });

const teams = [
  { id: 'demo-owls', name: 'Night Owls', color: '#7c3aed', members: ['katniss', 'hermione', 'mac'],
    done: ['q1', 'q2'], current: 'q3', coins: 35, compass: true },
  { id: 'demo-cobble', name: 'Cobblestone Crew', color: '#0891b2', members: ['tony', 'walter'],
    done: ['q1', 'q2', 'q3'], current: 'q4', coins: 30, hints: { q4: 1 } },
  { id: 'demo-bears', name: 'Bear Necessities', color: '#d97706', members: ['lara', 'jack'],
    done: quests.map(q => q.id), current: null, coins: 70, finishedAt: now - 12 * min },
  { id: 'demo-lost', name: 'Lost & Found', color: '#e11d48', members: ['indy'],
    done: ['q1'], current: 'q2', coins: 25 },
  // More teams on the board, without players of their own
  { id: 'demo-fondue', name: 'The Fondue Set', color: '#16a34a', members: [], done: ['q1', 'q2', 'q3', 'q4'], current: 'q5', coins: 20 },
  { id: 'demo-aare', name: 'Aare Swimmers', color: '#2563eb', members: [], done: ['q1', 'q2'], current: 'q3', coins: 20 },
  { id: 'demo-arcade', name: 'Arcade Runners', color: '#be185d', members: [], done: ['q1', 'q2'], current: 'q3', coins: 20 },
  { id: 'demo-clock', name: 'Clockwatchers', color: '#4d7c0f', members: [], done: ['q1'], current: 'q2', coins: 20 },
];

// What a team sees of its quest, as the server would have written it:
// no answers, the text once open, the hints it paid for
function viewOf(questId, hintsPaid = 0) {
  const q = quests.find(x => x.id === questId);
  const open = q.trigger === 'none';
  const unlockedAt = open ? now - 8 * min : null;
  return {
    questId: q.id, trigger: q.trigger, task: q.task,
    navigationHint: q.navigationHint ?? [],
    ...(q.trigger === 'location' ? { location: q.location, fenceRadius: q.fenceRadius } : {}),
    ...(q.trigger === 'distance' ? { distanceMeters: q.distanceMeters, showDistanceProgress: true } : {}),
    ...(q.task === 'timer' ? { durationSeconds: q.durationSeconds } : {}),
    unlockedAt, pausedMsAtUnlock: 0, walkedMeters: q.trigger === 'distance' ? 240 : 0,
    ...(open ? { title: q.title, description: q.description } : {}),
    hints: (q.hints ?? []).slice(0, hintsPaid), hintCount: (q.hints ?? []).length,
  };
}

for (const t of teams) {
  await put(`games/${GAME}/teams/${t.id}`, {
    gameId: GAME, name: t.name, color: t.color,
    memberIds: t.members.map(m => P[m]),
    solvedCount: t.done.length,
    finishedAt: t.finishedAt ?? null,
  });
  await put(`games/${GAME}/teams/${t.id}/private/state`, {
    gameId: GAME, teamId: t.id,
    coins: t.coins,
    currentQuestId: t.current, completedQuestIds: t.done,
    hintsRevealed: t.hints ?? {},
    quest: t.current ? viewOf(t.current, t.hints?.[t.current] ?? 0) : null,
    ...(t.compass ? { activeCompassUntil: now + 14 * min } : {}),
  });
}

// Everyone in the game, including Ron, who joined but hasn't picked a team
const teamOf = Object.fromEntries(teams.flatMap(t => t.members.map(m => [m, t.id])));
for (const m of [...teams.flatMap(t => t.members), 'ron']) {
  await put(`games/${GAME}/players/${P[m]}`, { uid: P[m], name: NAMES[m], teamId: teamOf[m] ?? null, joinedAt: started - 30 * min });
}

const activity = [
  ['start', { type: 'game_started', at: started, visibility: 'public', teamId: null }],
  ['bears-q1', { type: 'quest_solved', at: started + 9 * min, visibility: 'public', teamId: 'demo-bears', teamName: 'Bear Necessities', questNumber: 1 }],
  ['owls-q1', { type: 'quest_solved', at: started + 11 * min, visibility: 'public', teamId: 'demo-owls', teamName: 'Night Owls', questNumber: 1 }],
  ['cobble-q1', { type: 'quest_solved', at: started + 12 * min, visibility: 'public', teamId: 'demo-cobble', teamName: 'Cobblestone Crew', questNumber: 1 }],
  ['lost-q1', { type: 'quest_solved', at: started + 19 * min, visibility: 'public', teamId: 'demo-lost', teamName: 'Lost & Found', questNumber: 1 }],
  ['owls-q2', { type: 'quest_solved', at: started + 31 * min, visibility: 'public', teamId: 'demo-owls', teamName: 'Night Owls', questNumber: 2 }],
  ['cobble-q2', { type: 'quest_solved', at: started + 34 * min, visibility: 'public', teamId: 'demo-cobble', teamName: 'Cobblestone Crew', questNumber: 2 }],
  ['note', { type: 'admin_note', at: started + 40 * min, visibility: 'public', teamId: null, text: 'Ice cream at the Rose Garden for the first team to finish!' }],
  ['cobble-q3', { type: 'quest_solved', at: started + 58 * min, visibility: 'public', teamId: 'demo-cobble', teamName: 'Cobblestone Crew', questNumber: 3 }],
  ['owls-compass', { type: 'item_bought', at: started + 66 * min, visibility: 'team', teamId: 'demo-owls', teamName: 'Night Owls', itemName: 'a compass', amount: 25 }],
  ['owls-coins', { type: 'coins_adjusted', at: started + 70 * min, visibility: 'team', teamId: 'demo-owls', teamName: 'Night Owls', amount: 20, reason: 'best team costume' }],
  ['bears-q6', { type: 'quest_solved', at: now - 12 * min, visibility: 'public', teamId: 'demo-bears', teamName: 'Bear Necessities', questNumber: 6 }],
  ['bears-done', { type: 'team_finished', at: now - 12 * min + 1, visibility: 'public', teamId: 'demo-bears', teamName: 'Bear Necessities', placement: 1 }],
  ['cobble-hint', { type: 'hint_revealed', at: now - 6 * min, visibility: 'team', teamId: 'demo-cobble', teamName: 'Cobblestone Crew', questTitle: 'Bear Necessities', amount: 10 }],
];
for (const [id, entry] of activity) await put(`games/${GAME}/activity/demo-${id}`, entry);

const chat = [
  ['0b', false, P.mac, NAMES.mac, 'Can we use the bus between quests?', started + 22 * min],
  ['0c', true, P.sherlock, 'Hosts', 'Walking only, sorry. The fun is in the old town.', started + 24 * min],
  ['0d', false, P.katniss, NAMES.katniss, 'We bought a compass, it points straight into a wall', now - 40 * min],
  ['0e', true, P.sherlock, 'Hosts', 'It points as the crow flies. Go around the block!', now - 38 * min],
  ['1', false, P.katniss, NAMES.katniss, 'Is the cathedral open? The door looks locked.', now - 18 * min],
  ['2', true, P.sherlock, 'Hosts', 'You only need the portal outside, no need to go in.', now - 16 * min],
  ['3', false, P.hermione, NAMES.hermione, 'Got it, thanks!', now - 15 * min],
];
for (const [id, fromHost, authorId, authorName, body, sentAt] of chat) {
  await put(`games/${GAME}/messages/demo-${id}`, { teamId: 'demo-owls', authorId, authorName, fromHost, text: body, sentAt });
}

console.log('Demo race ready: "Bern Old Town Race" (code BEAR26), hosted by Sherlock.');
console.log('  Katniss — navigation hint with a compass   katniss@district12.gov / katniss');
console.log('  Tony    — answer quest with a hint shown   tony@stark.industries / tony123');
console.log('  Ron     — joined, picking a team           ron@pawnee.gov / swanson');
