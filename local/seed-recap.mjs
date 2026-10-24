// Turns the demo race into a finished one with a full history, to try the
// recap: three hours in Bern's old town, routes for every team, curses,
// robberies, a shield or two and a donation. Run after seed-demo.mjs:
//   node local/seed-recap.mjs
// Run seed-demo.mjs again to get the live race back.

const PROJECT = 'gcr26-d76cc';
const FS = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const GAME = 'demo-bern';

function value(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, value(x)])) } };
}
const fields = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, value(v)]));
async function put(path, data) {
  const res = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: fields(data) }) });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}
async function patch(path, data) {
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res = await fetch(`${FS}/${path}?${mask}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: fields(data) }) });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}
async function query(collection, field, equals, parent = '') {
  const res = await fetch(`${FS}${parent}:runQuery`, {
    method: 'POST', headers: OWNER,
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: collection }],
      ...(field ? { where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: value(equals) } } } : {}),
    } }),
  });
  return (await res.json()).filter(r => r.document).map(r => r.document.name);
}
const remove = name => fetch(`http://localhost:8080/v1/${name}`, { method: 'DELETE', headers: OWNER });
// Many writes in one request, as the emulator struggles with thousands of single ones
const DOCS = `projects/${PROJECT}/databases/(default)/documents`;
async function commit(writes) {
  for (let i = 0; i < writes.length; i += 400) {
    const res = await fetch(`${FS}:commit`, { method: 'POST', headers: OWNER, body: JSON.stringify({ writes: writes.slice(i, i + 400) }) });
    if (!res.ok) throw new Error(`commit: ${res.status} ${await res.text()}`);
  }
}

// A fixed seed, so every run tells the same story
let seed = 26;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const jitter = meters => (random() - 0.5) * 2 * meters / 111000;

const now = Date.now();
const min = 60000;
const started = now - 230 * min;
const ended = started + 195 * min;

// Old-town streets, as waypoints from quest to quest
const W = {
  zytglogge: [46.94797, 7.44795],
  kramgasse: [46.94800, 7.45000],
  muenster: [46.94706, 7.45125],
  plattform: [46.94660, 7.45080],
  nydegg: [46.94850, 7.45650],
  baerengraben: [46.94800, 7.45920],
  rosengarten: [46.95160, 7.46070],
  rathaus: [46.94910, 7.45300],
  marktgasse: [46.94850, 7.44450],
  bundeshaus: [46.94660, 7.44410],
  aare: [46.94450, 7.45500],      // the scenic wrong turn
  matte: [46.94530, 7.45230],
};
// Each team's path through the race, with a waypoint for every quest it solves
// marked by q (the quest's number)
const PATHS = {
  standard: [['zytglogge', 1], ['kramgasse', 2], ['muenster', 3], ['plattform'], ['nydegg'], ['baerengraben', 4], ['rosengarten', 5], ['rathaus'], ['marktgasse'], ['bundeshaus', 6]],
  detour: [['zytglogge', 1], ['kramgasse', 2], ['muenster', 3], ['plattform'], ['matte'], ['aare'], ['nydegg'], ['baerengraben', 4], ['rosengarten', 5], ['rathaus'], ['marktgasse'], ['bundeshaus', 6]],
};

const TEAMS = [
  // name, path, pace (minutes per waypoint), quests solved, members (for the trail)
  { id: 'demo-bears', pace: 15, path: 'standard', solved: 6, members: 2, coins: 15, shields: 0 },
  { id: 'demo-owls', pace: 16, path: 'standard', solved: 6, members: 3, coins: 0, shields: 1 },
  { id: 'demo-cobble', pace: 15.5, path: 'detour', solved: 6, members: 2, coins: 45, shields: 0 },
  { id: 'demo-fondue', pace: 17, path: 'standard', solved: 6, members: 2, coins: 30, shields: 0 },
  { id: 'demo-lost', pace: 14, path: 'detour', solved: 5, members: 1, coins: 5, shields: 0 },
  { id: 'demo-aare', pace: 19, path: 'standard', solved: 5, members: 2, coins: 60, shields: 0 },
  { id: 'demo-arcade', pace: 21, path: 'standard', solved: 4, members: 2, coins: 20, shields: 1 },
  { id: 'demo-clock', pace: 26, path: 'standard', solved: 4, members: 2, coins: 40, shields: 0 },
];

const teamDocs = Object.fromEntries((await query('teams', 'gameId', GAME)).map(n => [n.split('/').pop(), n]));
const name = {};
for (const id of Object.keys(teamDocs)) {
  const res = await fetch(`http://localhost:8080/v1/${teamDocs[id]}`, { headers: OWNER });
  name[id] = (await res.json()).fields.name.stringValue;
}

// Clear the live race's history
await commit([
  ...await query('activity', null, null, `/games/${GAME}`),
  ...await query('trail', 'gameId', GAME),
].map(n => ({ delete: n })));
await remove(`projects/${PROJECT}/databases/(default)/documents/games/${GAME}/recap/summary`);

const activity = [];
const entry = (id, e) => activity.push([id, { visibility: 'public', ...e }]);
entry('started', { type: 'game_started', at: started, teamId: null, teamName: null });

let trailCount = 0;
const finishes = [];
for (const team of TEAMS) {
  const path = PATHS[team.path];
  let t = started + random() * 3 * min;
  let solvedCount = 0;
  const trail = [];
  for (let i = 0; i < path.length; i++) {
    const [key, quest] = path[i];
    const [lat, lng] = W[key];
    const [plat, plng] = i ? W[path[i - 1][0]] : W.zytglogge;
    const legMinutes = (i ? team.pace : 4) * (0.8 + random() * 0.4);
    // Walk the leg, one fix every 45 seconds per member
    for (let s = 0; s <= legMinutes * 60; s += 45) {
      const f = s / (legMinutes * 60);
      for (let m = 0; m < team.members; m++) {
        trail.push({
          lat: plat + (lat - plat) * f + jitter(12),
          lng: plng + (lng - plng) * f + jitter(12),
          t: t + s * 1000 + m * 9000,
          m,
        });
      }
    }
    t += legMinutes * min;
    // A bad fix now and then, for the smoothing to catch
    if (random() < 0.3) trail.push({ lat: lat + jitter(900), lng: lng + jitter(900), t: t - 20000, m: 0 });
    if (quest && solvedCount < team.solved && t < ended) {
      solvedCount++;
      t += (2 + random() * 4) * min;
      entry(`${team.id}-q${quest}`, { type: 'quest_solved', at: Math.round(t), teamId: team.id, teamName: name[team.id], questNumber: quest });
    }
    if (t > ended) break;
    // Out of time: still on the way to the next quest when the race ends
    if (!quest && solvedCount >= team.solved && solvedCount < 6) break;
  }
  const finishedAt = solvedCount === 6 && t < ended ? Math.round(t) + 1 : null;
  if (finishedAt) finishes.push([team.id, finishedAt]);
  const points = trail.filter(p => p.t <= ended);
  await commit(points.map(p => ({ update: {
    name: `${DOCS}/trail/recap-${team.id}-${trailCount++}`,
    fields: fields({ userId: `${team.id}-member-${p.m}`, teamId: team.id, gameId: GAME, lat: p.lat, lng: p.lng, t: Math.round(p.t) }),
  } })));
  await patch(`teams/${team.id}`, {
    completedQuestIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].slice(0, solvedCount),
    currentQuestId: solvedCount < 6 ? `q${solvedCount + 1}` : null,
    finishedAt,
    coins: team.coins,
    shields: team.shields,
    hintsRevealed: {},
    questProgress: null,
    cursedUntil: 0,
    robbedAt: 0,
    activeCompassUntil: 0,
    activeRadarUntil: 0,
  });
}
finishes.sort((a, b) => a[1] - b[1]).forEach(([id, at], i) =>
  entry(`${id}-finished`, { type: 'team_finished', at, teamId: id, teamName: name[id], placement: i + 1 }));

// What the teams did to each other, and bought for themselves
const at = minutes => started + minutes * min;
const attack = (id, minutes, type, from, to, extra = {}) => entry(id, {
  type, at: at(minutes), teamId: from, teamName: name[from], targetTeamId: to, targetTeamName: name[to], ...extra,
});
const bought = (id, minutes, team, itemType, itemName, amount) => entry(id, {
  type: 'item_bought', at: at(minutes), visibility: 'team', teamId: team, teamName: name[team], itemType, itemName, amount,
});
const hint = (id, minutes, team, questTitle) => entry(id, {
  type: 'hint_revealed', at: at(minutes), visibility: 'team', teamId: team, teamName: name[team], questTitle, amount: 10,
});

bought('owls-shield', 30, 'demo-owls', 'shield', 'a shield', 30);
bought('owls-shield2', 95, 'demo-owls', 'shield', 'a shield', 30);
bought('arcade-shield', 40, 'demo-arcade', 'shield', 'a shield', 30);
bought('lost-compass', 46, 'demo-lost', 'compass', 'a compass', 25);
bought('lost-compass2', 88, 'demo-lost', 'compass', 'a compass', 25);
bought('aare-radar', 70, 'demo-aare', 'radar', 'a radar', 15);
bought('clock-compass', 75, 'demo-clock', 'compass', 'a compass', 25);
attack('curse-1', 48, 'team_cursed', 'demo-cobble', 'demo-bears', { itemType: 'curse', durationMinutes: 5 });
attack('curse-2', 62, 'team_cursed', 'demo-fondue', 'demo-bears', { itemType: 'curse', durationMinutes: 5 });
attack('blocked-1', 71, 'attack_blocked', 'demo-bears', 'demo-owls', { itemType: 'curse' });
attack('robbery-1', 84, 'team_robbed', 'demo-lost', 'demo-aare', { itemType: 'robbery', amount: 24 });
attack('curse-3', 101, 'team_cursed', 'demo-lost', 'demo-bears', { itemType: 'curse', durationMinutes: 5 });
attack('blocked-2', 112, 'attack_blocked', 'demo-cobble', 'demo-owls', { itemType: 'robbery' });
attack('donation-1', 118, 'coins_donated', 'demo-aare', 'demo-clock', { itemType: 'donate', amount: 20 });
attack('curse-4', 131, 'team_cursed', 'demo-bears', 'demo-cobble', { itemType: 'curse', durationMinutes: 5 });
attack('robbery-2', 140, 'team_robbed', 'demo-cobble', 'demo-fondue', { itemType: 'robbery', amount: 30 });
attack('curse-5', 150, 'team_cursed', 'demo-clock', 'demo-arcade', { itemType: 'curse', durationMinutes: 5 });
// A feud for the archrivals award: Cobblestone Crew and Bear Necessities
attack('curse-6', 90, 'team_cursed', 'demo-cobble', 'demo-bears', { itemType: 'curse', durationMinutes: 5 });
hint('cobble-h1', 55, 'demo-cobble', 'The Tallest Tower');
hint('lost-h1', 58, 'demo-lost', 'The Tallest Tower');
hint('lost-h2', 92, 'demo-lost', 'Bear Necessities');
hint('lost-h3', 94, 'demo-lost', 'Bear Necessities');
hint('clock-h1', 60, 'demo-clock', 'Time Keeper');
hint('clock-h2', 120, 'demo-clock', 'Bear Necessities');
hint('arcade-h1', 105, 'demo-arcade', 'Bear Necessities');
hint('fondue-h1', 90, 'demo-fondue', 'Bear Necessities');
entry('ended', { type: 'game_ended', at: ended, teamId: null, teamName: null });

for (const [id, e] of activity) await put(`games/${GAME}/activity/recap-${id}`, e);
await patch(`games/${GAME}`, { startDateTime: started, endedAt: ended, pausedAt: null, totalPausedMs: 0 });

console.log(`Finished race: ${activity.length} entries, ${trailCount} trail points, ${finishes.length} teams finished`);
