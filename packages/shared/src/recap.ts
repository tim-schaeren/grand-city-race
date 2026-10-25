import type { ActivityEntry } from './activity';
import { gameEconomy } from './economy';
import { metersBetween } from './geo';
import { raceTimeMs } from './raceTime';
import { shopConfig, type ShopItemType } from './shop';
import type { Game, Team, TeamState, TrailPoint } from './types';

// The recap: what happened in a race, told after it's over. The server builds
// it when a host asks, reading everything, including what only hosts may see,
// and keeps just what the recap shows. It's saved as one document,
// games/{gameId}/recap/summary, which players can read once a host shows it.
//
// Routes are per team, never per player, and deliberately approximate: the
// members' positions are merged minute by minute and smoothed.

// A team as the recap reads it: what everyone sees, and its final balance
export type RecapTeamInput = Team & Partial<Pick<TeamState, 'coins' | 'shields' | 'completedQuestIds'>>;

export interface RecapInput {
  game: Game;
  teams: RecapTeamInput[];
  activity: ActivityEntry[];
  trail: TrailPoint[];
  now: number;
}

export type RecapEventType = 'curse' | 'robbery' | 'blocked' | 'donation' | 'finish';

export interface RecapEvent {
  type: RecapEventType;
  at: number;                  // seconds after the start
  teamId: string;              // who did it (the finisher, for 'finish')
  targetTeamId: string | null;
  amount: number | null;       // robbery: coins taken; donation: coins given
  minutes: number | null;      // curse
  itemType: string | null;     // blocked: which attack the shield stopped
  lat: number | null;          // where it landed: the target's position, or the finisher's
  lng: number | null;
}

export interface RecapTeamStats {
  place: number;
  finishedAt: number | null;   // race time in seconds: start to finish, without pauses before it
  questsSolved: number;
  hints: number;
  coinsEarned: number;         // from quests
  coinsSpent: number;
  coinsLeft: number;
  distanceMeters: number;
  bought: Partial<Record<ShopItemType, number>>;
  cursesCast: number;
  cursesReceived: number;
  cursedMinutes: number;
  stolen: number;
  lostToRobbery: number;
  donatedOut: number;
  donatedIn: number;
  blocksByShield: number;      // attacks this team's shields stopped
  bouncedOff: number;          // this team's attacks that hit a shield
  shieldsLeft: number;
  bestPlace: number;
  worstPlace: number;
  nemesisId: string | null;    // the team that attacked this one most, twice or more
  nemesisAttacks: number;
}

export interface RecapTeam {
  id: string;
  name: string;
  color: string;
  stats: RecapTeamStats;
}

export type RecapAwardId =
  | 'mostCursed'
  | 'curseMaster'
  | 'archrivals'
  | 'robinHood'
  | 'shieldWall'
  | 'bouncedOff'
  | 'wastedShield'
  | 'hintLovers'
  | 'noHints'
  | 'scrooge'
  | 'bigSpender'
  | 'generous'
  | 'marathon'
  | 'comeback';

export interface RecapAward {
  id: RecapAwardId;
  teamIds: string[];           // more than one on a tie
  value: number;
  // archrivals: their attacks on each other, each way
  feud?: { from: string; to: string; count: number }[];
}

// Curses, robberies and attacks a shield stopped, by attacker and target
type Attacks = Map<string, Map<string, number>>;
const RIVALRY_MIN = 3;          // attacks on each other, both ways together
const NEMESIS_MIN = 2;          // attacks on one team by the same team

export interface Recap {
  version: 1;
  builtAt: number;
  publishedAt: number | null;    // when a host showed it to players; null = hosts only
  announcedAt?: number | null;   // when players were first told, so they're told once
  game: {
    name: string;
    city: string;
    themeId: string | null;
    timeZone: string | null;   // the game's, for showing its dates
    center: { lat: number; lng: number };
    startedAt: number;         // epoch ms
    durationSeconds: number;
    questCount: number;
  };
  teams: RecapTeam[];          // in final order
  // Firestore holds no arrays of arrays, so each route is flat:
  // [lat, lng, secondsAfterStart, lat, lng, seconds, …]
  routes: Record<string, number[]>;
  // Places at evenly spaced moments: times[i] seconds after the start,
  // places[teamId][i] the team's place then
  places: { times: number[]; byTeam: Record<string, number[]> };
  events: RecapEvent[];
  awards: RecapAward[];
}

// ─── Routes ──────────────────────────────────────────────────────────────────

const BUCKET_MS = 60_000;          // members' positions merge per minute
const SPIKE_METERS = 250;          // a jump out and straight back is GPS noise
const SIMPLIFY_METERS = 10;
const MAX_ROUTE_POINTS = 400;

interface RoutePoint { lat: number; lng: number; t: number }

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// One position per minute for the whole team: the median of where its members
// were, so one phone with a bad fix doesn't drag the route away
function mergeMembers(points: TrailPoint[]): RoutePoint[] {
  const buckets = new Map<number, TrailPoint[]>();
  for (const p of points) {
    const key = Math.floor(p.t / BUCKET_MS);
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) => ({
      lat: median(list.map(p => p.lat)),
      lng: median(list.map(p => p.lng)),
      t: median(list.map(p => p.t)),
    }));
}

function removeSpikes(route: RoutePoint[]): RoutePoint[] {
  return route.filter((p, i) => {
    const prev = route[i - 1];
    const next = route[i + 1];
    if (!prev || !next) return true;
    return !(
      metersBetween(prev, p) > SPIKE_METERS
      && metersBetween(p, next) > SPIKE_METERS
      && metersBetween(prev, next) < SPIKE_METERS / 2
    );
  });
}

// A weighted moving average, which rounds corners and blurs where exactly a
// team stood
function smooth(route: RoutePoint[]): RoutePoint[] {
  const weights = [1, 2, 3, 2, 1];
  const half = weights.length >> 1;
  return route.map((p, i) => {
    let lat = 0, lng = 0, total = 0;
    weights.forEach((w, k) => {
      const q = route[i + k - half];
      if (!q) return;
      lat += q.lat * w;
      lng += q.lng * w;
      total += w;
    });
    return { lat: lat / total, lng: lng / total, t: p.t };
  });
}

// How far a point is from where the line through its neighbours puts the team
// at the same moment. Measuring at the same moment keeps stops: a team that
// stood still for ten minutes doesn't turn into one creeping along.
function offsetMeters(p: RoutePoint, a: RoutePoint, b: RoutePoint): number {
  const f = b.t === a.t ? 0 : (p.t - a.t) / (b.t - a.t);
  return metersBetween(p, { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f });
}

// Douglas–Peucker: drops points that add nothing to the route
function simplify(route: RoutePoint[], tolerance: number): RoutePoint[] {
  if (route.length < 3) return route;
  const keep = new Array(route.length).fill(false);
  keep[0] = keep[route.length - 1] = true;
  const stack: [number, number][] = [[0, route.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    let worst = -1, index = -1;
    for (let i = from + 1; i < to; i++) {
      const d = offsetMeters(route[i], route[from], route[to]);
      if (d > worst) { worst = d; index = i; }
    }
    if (worst > tolerance) {
      keep[index] = true;
      stack.push([from, index], [index, to]);
    }
  }
  return route.filter((_, i) => keep[i]);
}

function routeLength(route: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += metersBetween(route[i - 1], route[i]);
  return total;
}

// Where a team was at a moment, between its route's points
export function positionAt(route: RoutePoint[], t: number): { lat: number; lng: number } | null {
  if (!route.length) return null;
  if (t <= route[0].t) return route[0];
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    if (t <= b.t) {
      const f = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
    }
  }
  return route[route.length - 1];
}

export function buildTeamRoute(points: TrailPoint[]): { route: RoutePoint[]; distanceMeters: number } {
  const smoothed = smooth(removeSpikes(mergeMembers(points)));
  let tolerance = SIMPLIFY_METERS;
  let route = simplify(smoothed, tolerance);
  while (route.length > MAX_ROUTE_POINTS) route = simplify(smoothed, (tolerance *= 1.5));
  return { route, distanceMeters: Math.round(routeLength(smoothed)) };
}

// ─── Places ──────────────────────────────────────────────────────────────────

const PLACE_SAMPLES = 60;

// The leaderboard's order at a moment: finished teams by finishing time, then
// by quests solved, and among equals whoever got there first. Teams still level
// share a place, as everyone does at the start.
function placesAt(
  teams: RecapTeamInput[],
  solves: Map<string, number[]>,
  finishes: Map<string, number>,
  t: number,
): Map<string, number> {
  const rows = teams.map(team => {
    const times = (solves.get(team.id) ?? []).filter(at => at <= t);
    const finished = finishes.get(team.id);
    return {
      id: team.id,
      name: team.name,
      finishedAt: finished !== undefined && finished <= t ? finished : null,
      solved: times.length,
      last: times.length ? times[times.length - 1] : 0,
    };
  });
  const order = (a: typeof rows[number], b: typeof rows[number]) => {
    if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
    if (a.finishedAt !== null) return -1;
    if (b.finishedAt !== null) return 1;
    if (b.solved !== a.solved) return b.solved - a.solved;
    return a.last - b.last;
  };
  rows.sort((a, b) => order(a, b) || a.name.localeCompare(b.name));
  const places = new Map<string, number>();
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    places.set(row.id, prev && order(prev, row) === 0 ? places.get(prev.id)! : i + 1);
  });
  return places;
}

// ─── Awards ──────────────────────────────────────────────────────────────────

// The team (or teams, on a tie) with the highest value, if it's worth an award
function topOf(teams: RecapTeam[], value: (s: RecapTeamStats) => number, min = 1): { teamIds: string[]; value: number } | null {
  const best = Math.max(...teams.map(t => value(t.stats)));
  if (!(best >= min)) return null;
  return { teamIds: teams.filter(t => value(t.stats) === best).map(t => t.id), value: best };
}

// The two teams that went after each other most, both ways. A one-sided
// campaign isn't a rivalry; among equals the closer feud wins.
function archrivals(attacks: Attacks): RecapAward | null {
  const count = (from: string, to: string) => attacks.get(from)?.get(to) ?? 0;
  let best: { a: string; b: string; ab: number; ba: number } | null = null;
  const seen = new Set<string>();
  for (const [a, targets] of attacks) {
    for (const b of targets.keys()) {
      const key = [a, b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const ab = count(a, b), ba = count(b, a);
      if (!ab || !ba || ab + ba < RIVALRY_MIN) continue;
      const better = !best
        || ab + ba > best.ab + best.ba
        || (ab + ba === best.ab + best.ba && Math.abs(ab - ba) < Math.abs(best.ab - best.ba));
      if (better) best = ab >= ba ? { a, b, ab, ba } : { a: b, b: a, ab: ba, ba: ab };
    }
  }
  if (!best) return null;
  return {
    id: 'archrivals',
    teamIds: [best.a, best.b],
    value: best.ab + best.ba,
    feud: [{ from: best.a, to: best.b, count: best.ab }, { from: best.b, to: best.a, count: best.ba }],
  };
}

function buildAwards(teams: RecapTeam[], attacks: Attacks): RecapAward[] {
  const awards: RecapAward[] = [];
  const add = (id: RecapAwardId, found: { teamIds: string[]; value: number } | null) => {
    // An award most teams share isn't one
    if (found && found.teamIds.length <= Math.min(3, teams.length - 1)) awards.push({ id, ...found });
  };
  add('mostCursed', topOf(teams, s => s.cursesReceived));
  add('curseMaster', topOf(teams, s => s.cursesCast));
  const rivals = archrivals(attacks);
  if (rivals) awards.push(rivals);
  add('robinHood', topOf(teams, s => s.stolen));
  add('shieldWall', topOf(teams, s => s.blocksByShield));
  add('bouncedOff', topOf(teams, s => s.bouncedOff));
  add('wastedShield', topOf(teams, s => s.shieldsLeft));
  add('hintLovers', topOf(teams, s => s.hints));
  // Only worth telling when other teams needed hints
  const hintless = teams.filter(t => t.stats.hints === 0 && t.stats.questsSolved > 0);
  if (hintless.length && hintless.length < teams.length) {
    awards.push({ id: 'noHints', teamIds: hintless.map(t => t.id), value: 0 });
  }
  add('scrooge', topOf(teams, s => s.coinsLeft));
  add('bigSpender', topOf(teams, s => s.coinsSpent));
  add('generous', topOf(teams, s => s.donatedOut));
  add('marathon', topOf(teams, s => s.distanceMeters, 100));
  add('comeback', topOf(teams, s => s.worstPlace - s.place, 2));
  return awards;
}

// ─── The recap ───────────────────────────────────────────────────────────────

export function buildRecap({ game, teams, activity, trail, now }: RecapInput): Recap {
  const economy = gameEconomy(game);
  const shop = shopConfig(game);
  const sorted = [...activity].sort((a, b) => a.at - b.at);
  const teamIds = new Set(teams.map(t => t.id));

  // The start time is when the race began: Start now moves it to that moment.
  // A team acting before it (a test run, a race started by hand long ago)
  // moves the start back to them.
  const firstEvent = sorted.find(e => e.teamId && teamIds.has(e.teamId))?.at ?? game.startDateTime;
  const startedAt = Math.min(game.startDateTime, firstEvent);
  const lastFinish = Math.max(0, ...teams.map(t => t.finishedAt ?? 0));
  const endedAt = game.endedAt ?? (Math.max(lastFinish, sorted.at(-1)?.at ?? 0) || now);
  const sec = (ms: number) => Math.max(0, Math.round((ms - startedAt) / 1000));

  // Routes
  const routes: Record<string, number[]> = {};
  const routeById = new Map<string, RoutePoint[]>();
  const distance = new Map<string, number>();
  for (const team of teams) {
    const points = trail.filter(p => p.teamId === team.id && p.t >= startedAt && p.t <= endedAt);
    const { route, distanceMeters } = buildTeamRoute(points);
    routeById.set(team.id, route);
    distance.set(team.id, distanceMeters);
    routes[team.id] = route.flatMap(p => [
      Math.round(p.lat * 1e5) / 1e5,
      Math.round(p.lng * 1e5) / 1e5,
      sec(p.t),
    ]);
  }

  // Solves and finishes, for places over time
  const solves = new Map<string, number[]>();
  const finishes = new Map<string, number>();
  for (const e of sorted) {
    if (!e.teamId || !teamIds.has(e.teamId)) continue;
    if (e.type === 'quest_solved') solves.set(e.teamId, [...(solves.get(e.teamId) ?? []), e.at]);
  }
  for (const team of teams) if (team.finishedAt) finishes.set(team.id, team.finishedAt);

  const times: number[] = [];
  const byTeam: Record<string, number[]> = Object.fromEntries(teams.map(t => [t.id, []]));
  for (let i = 0; i <= PLACE_SAMPLES; i++) {
    const t = startedAt + ((endedAt - startedAt) * i) / PLACE_SAMPLES;
    times.push(sec(t));
    const places = placesAt(teams, solves, finishes, t);
    for (const team of teams) byTeam[team.id].push(places.get(team.id)!);
  }
  // The final order follows the teams themselves, which include hosts' corrections
  const finalSolves = new Map(teams.map(t => [t.id, t.completedQuestIds ?? []]));
  const lastSolve = new Map(teams.map(t => [t.id, solves.get(t.id)?.at(-1) ?? 0]));
  const finalOrder = [...teams].sort((a, b) => {
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    if (a.finishedAt) return -1;
    if (b.finishedAt) return 1;
    const diff = finalSolves.get(b.id)!.length - finalSolves.get(a.id)!.length;
    if (diff) return diff;
    return lastSolve.get(a.id)! - lastSolve.get(b.id)! || a.name.localeCompare(b.name);
  });
  finalOrder.forEach((t, i) => { byTeam[t.id][PLACE_SAMPLES] = i + 1; });

  // Stats and events
  const stats = new Map<string, RecapTeamStats>();
  finalOrder.forEach((team, i) => {
    stats.set(team.id, {
      place: i + 1,
      finishedAt: team.finishedAt
        ? Math.round((raceTimeMs(team, { ...game, startDateTime: startedAt }, activity) ?? 0) / 1000)
        : null,
      questsSolved: finalSolves.get(team.id)!.length,
      hints: 0,
      coinsEarned: finalSolves.get(team.id)!.length * economy.coinsPerQuest,
      coinsSpent: 0,
      coinsLeft: typeof team.coins === 'number' ? team.coins : economy.startingCoins,
      distanceMeters: distance.get(team.id) ?? 0,
      bought: {},
      cursesCast: 0,
      cursesReceived: 0,
      cursedMinutes: 0,
      stolen: 0,
      lostToRobbery: 0,
      donatedOut: 0,
      donatedIn: 0,
      blocksByShield: 0,
      bouncedOff: 0,
      shieldsLeft: team.shields ?? 0,
      bestPlace: i + 1,
      worstPlace: i + 1,
      nemesisId: null,
      nemesisAttacks: 0,
    });
  });

  const events: RecapEvent[] = [];
  const at = (teamId: string | null | undefined, ms: number) => {
    const p = teamId ? positionAt(routeById.get(teamId) ?? [], ms) : null;
    return { lat: p ? Math.round(p.lat * 1e5) / 1e5 : null, lng: p ? Math.round(p.lng * 1e5) / 1e5 : null };
  };
  const event = (e: ActivityEntry, type: RecapEventType, extra: Partial<RecapEvent> = {}) => {
    events.push({
      type,
      at: sec(e.at),
      teamId: e.teamId!,
      targetTeamId: e.targetTeamId ?? null,
      amount: null,
      minutes: null,
      itemType: null,
      ...at(e.targetTeamId ?? e.teamId, e.at),
      ...extra,
    });
  };

  const attacks: Attacks = new Map();
  const attacked = (from: string, to: string | undefined) => {
    if (!to) return;
    const targets = attacks.get(from) ?? new Map<string, number>();
    targets.set(to, (targets.get(to) ?? 0) + 1);
    attacks.set(from, targets);
  };

  for (const e of sorted) {
    const own = e.teamId ? stats.get(e.teamId) : undefined;
    const target = e.targetTeamId ? stats.get(e.targetTeamId) : undefined;
    if (!own) continue;
    switch (e.type) {
      case 'hint_revealed':
        own.hints += 1;
        own.coinsSpent += e.amount ?? economy.hintCost;
        break;
      case 'item_bought': {
        const item = e.itemType as ShopItemType;
        own.bought[item] = (own.bought[item] ?? 0) + 1;
        own.coinsSpent += e.amount ?? 0;
        break;
      }
      case 'team_cursed':
        own.cursesCast += 1;
        own.bought.curse = (own.bought.curse ?? 0) + 1;
        own.coinsSpent += shop.curse.price;
        if (target) {
          target.cursesReceived += 1;
          target.cursedMinutes += e.durationMinutes ?? 0;
        }
        attacked(e.teamId!, e.targetTeamId);
        event(e, 'curse', { minutes: e.durationMinutes ?? null });
        break;
      case 'team_robbed':
        own.bought.robbery = (own.bought.robbery ?? 0) + 1;
        own.coinsSpent += shop.robbery.price;
        own.stolen += e.amount ?? 0;
        if (target) target.lostToRobbery += e.amount ?? 0;
        attacked(e.teamId!, e.targetTeamId);
        event(e, 'robbery', { amount: e.amount ?? 0 });
        break;
      case 'attack_blocked': {
        const item = e.itemType === 'robbery' ? 'robbery' : 'curse';
        own.bought[item] = (own.bought[item] ?? 0) + 1;
        own.coinsSpent += shop[item].price;
        own.bouncedOff += 1;
        if (target) target.blocksByShield += 1;
        attacked(e.teamId!, e.targetTeamId);
        event(e, 'blocked', { itemType: item });
        break;
      }
      case 'coins_donated':
        own.donatedOut += e.amount ?? 0;
        if (target) target.donatedIn += e.amount ?? 0;
        event(e, 'donation', { amount: e.amount ?? 0 });
        break;
    }
  }
  for (const team of finalOrder) {
    if (team.finishedAt) {
      const e = { at: team.finishedAt, teamId: team.id } as ActivityEntry;
      event(e, 'finish');
    }
  }
  events.sort((a, b) => a.at - b.at);

  // Best and worst places, leaving out the first part of the race, when
  // everyone is still at the start and the order means little
  const settled = Math.ceil(PLACE_SAMPLES * 0.15);
  for (const [id, places] of Object.entries(byTeam)) {
    const s = stats.get(id)!;
    const later = places.slice(settled);
    s.bestPlace = Math.min(...later);
    s.worstPlace = Math.max(...later);
  }

  // Each team's nemesis: whoever went after it most, if more than once
  for (const [from, targets] of attacks) {
    for (const [to, n] of targets) {
      const s = stats.get(to);
      if (s && n >= NEMESIS_MIN && n > s.nemesisAttacks) {
        s.nemesisId = from;
        s.nemesisAttacks = n;
      }
    }
  }

  const recapTeams: RecapTeam[] = finalOrder.map(t => ({
    id: t.id,
    name: t.name,
    color: t.color,
    stats: stats.get(t.id)!,
  }));

  return {
    version: 1,
    builtAt: now,
    publishedAt: null,
    game: {
      name: game.name,
      city: game.city,
      themeId: game.themeId ?? null,
      timeZone: game.timeZone ?? null,
      center: game.cityCoordinates,
      startedAt,
      durationSeconds: sec(endedAt),
      questCount: game.questOrder?.length ?? 0,
    },
    teams: recapTeams,
    routes,
    places: { times, byTeam },
    events,
    awards: buildAwards(recapTeams, attacks),
  };
}

// Reads a route back from its flat form
export function recapRoute(recap: Recap, teamId: string): RoutePoint[] {
  const flat = recap.routes[teamId] ?? [];
  const route: RoutePoint[] = [];
  for (let i = 0; i + 2 < flat.length; i += 3) route.push({ lat: flat[i], lng: flat[i + 1], t: flat[i + 2] });
  return route;
}
