// Moves the data to the per-game model (see packages/shared/src/paths.ts):
// teams and trails into their games, positions out of private entries, push
// tokens and admin rights off profiles. Copies and leaves the old data in
// place; --cleanup deletes the old data once the new is checked.
//
//   node local/migrate-v2.mjs --dry-run      # counts what it would do
//   node local/migrate-v2.mjs                # copies
//   node local/migrate-v2.mjs --cleanup      # deletes the old data
//
// Against the emulators when FIRESTORE_EMULATOR_HOST is set (and
// FIREBASE_AUTH_EMULATOR_HOST, GCLOUD_PROJECT); otherwise against production
// with apps/mobile/play-service-account.json.

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const cleanup = process.argv.includes('--cleanup');
const force = process.argv.includes('--force');

if (process.env.FIRESTORE_EMULATOR_HOST) {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'gcr26-d76cc' });
} else {
  const key = JSON.parse(readFileSync('apps/mobile/play-service-account.json', 'utf8'));
  initializeApp({ credential: cert(key), projectId: key.project_id });
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth();
console.log(`${process.env.FIRESTORE_EMULATOR_HOST ? 'Emulator' : 'PRODUCTION'}${dryRun ? ', dry run' : ''}${cleanup ? ', cleanup' : ''}`);

const counts = {};
const count = (what, n = 1) => { counts[what] = (counts[what] ?? 0) + n; };
const writer = db.bulkWriter();
const write = (what, fn) => { count(what); if (!dryRun) fn(); };

const [games, teams, users, trail] = await Promise.all([
  db.collection('games').get(),
  db.collection('teams').get(),
  db.collection('users').get(),
  db.collection('trail').get(),
]);

if (cleanup) {
  // Only once every game has its teams in the new place
  for (const team of teams.docs) {
    const moved = await db.doc(`games/${team.get('gameId')}/teams/${team.id}`).get();
    if (!moved.exists) throw new Error(`Team ${team.id} has not been moved yet`);
    for (const entry of (await team.ref.collection('coinLedger').get()).docs) write('old coin ledger entries', () => writer.delete(entry.ref));
    write('old teams', () => writer.delete(team.ref));
  }
  trail.forEach(p => write('old trail points', () => writer.delete(p.ref)));
  for (const game of games.docs) {
    for (const entry of (await game.ref.collection('private').get()).docs) write('old private entries', () => writer.delete(entry.ref));
  }
  // The fields profiles no longer hold
  users.forEach(u => write('profiles tidied', () => writer.update(u.ref, {
    isAdmin: FieldValue.delete(), teamId: FieldValue.delete(), gameId: FieldValue.delete(),
    pushToken: FieldValue.delete(), lastLocation: FieldValue.delete(),
  })));
} else {
  const already = await db.collectionGroup('private').where('gameId', '!=', null).limit(1).get();
  if (!already.empty && !force) throw new Error('Teams were already moved; run with --force to copy again over them');

  const profile = Object.fromEntries(users.docs.map(u => [u.id, u.data()]));
  const pushTokens = Object.fromEntries(users.docs.map(u => [u.id, new Set(u.get('pushToken') ? [u.get('pushToken')] : [])]));

  for (const game of games.docs) {
    const g = game.data();
    const economy = {
      startingCoins: typeof g.startingCoins === 'number' ? g.startingCoins : 0,
    };
    const gameTeams = teams.docs.filter(t => t.get('gameId') === game.id);
    const teamOf = {};
    gameTeams.forEach(t => (t.get('memberIds') ?? []).forEach(uid => { teamOf[uid] = t.id; }));

    // Teams: what everyone sees, and what only the team and its hosts see
    for (const team of gameTeams) {
      const t = team.data();
      write('teams', () => writer.set(db.doc(`games/${game.id}/teams/${team.id}`), {
        gameId: game.id,
        name: t.name ?? 'Team',
        color: t.color ?? '#334155',
        memberIds: t.memberIds ?? [],
        solvedCount: (t.completedQuestIds ?? []).length,
        finishedAt: t.finishedAt ?? null,
        pausedMsAtFinish: t.pausedMsAtFinish,
      }));
      write('team states', () => writer.set(db.doc(`games/${game.id}/teams/${team.id}/private/state`), {
        gameId: game.id,
        teamId: team.id,
        coins: typeof t.coins === 'number' ? t.coins : economy.startingCoins,
        // A finished team has no current quest; the others go on where they were
        currentQuestId: t.finishedAt ? null : t.currentQuestId ?? null,
        completedQuestIds: t.completedQuestIds ?? [],
        hintsRevealed: t.hintsRevealed ?? {},
        // The server rebuilds what the team sees of its quest when the app opens
        quest: null,
        activeCompassUntil: t.activeCompassUntil,
        activeRadarUntil: t.activeRadarUntil,
        shields: t.shields,
        cursedUntil: t.cursedUntil,
        cursedByName: t.cursedByName,
        robbedAt: t.robbedAt,
        teamChatReadAt: t.teamChatReadAt,
        hostChatReadAt: t.hostChatReadAt,
      }));
      for (const entry of (await team.ref.collection('coinLedger').get()).docs) {
        write('coin ledger entries', () => writer.set(db.doc(`games/${game.id}/teams/${team.id}/coinLedger/${entry.id}`), entry.data()));
      }
    }

    // The player list, with each player's team; players a host added by hand
    // had no entry and get one
    const entries = await game.ref.collection('players').get();
    const listed = new Set();
    for (const entry of entries.docs) {
      listed.add(entry.id);
      write('players', () => writer.set(entry.ref, {
        uid: entry.id,
        name: entry.get('name') ?? profile[entry.id]?.name ?? 'A player',
        teamId: teamOf[entry.id] ?? null,
        joinedAt: entry.get('joinedAt') ?? 0,
      }));
    }
    for (const [uid, teamId] of Object.entries(teamOf)) {
      if (listed.has(uid) || !profile[uid]) continue;
      write('players added from teams', () => writer.set(db.doc(`games/${game.id}/players/${uid}`), {
        uid, name: profile[uid].name ?? 'A player', teamId, joinedAt: 0,
      }));
    }

    // Last positions, for the live map; push tokens go to the profile
    for (const entry of (await game.ref.collection('private').get()).docs) {
      const { lastLocation, pushToken } = entry.data();
      if (pushToken && pushTokens[entry.id]) pushTokens[entry.id].add(pushToken);
      if (lastLocation && teamOf[entry.id]) {
        write('positions', () => writer.set(db.doc(`games/${game.id}/positions/${entry.id}`), {
          uid: entry.id, teamId: teamOf[entry.id],
          lat: lastLocation.lat, lng: lastLocation.lng, updatedAt: lastLocation.updatedAt ?? 0,
        }));
      }
    }
  }

  // Trails into their games
  for (const point of trail.docs) {
    const p = point.data();
    if (!p.gameId) continue;
    write('trail points', () => writer.set(db.doc(`games/${p.gameId}/trail/${point.id}`), {
      uid: p.userId, teamId: p.teamId, lat: p.lat, lng: p.lng, t: p.t,
    }));
  }

  // Push tokens onto profiles, admin rights onto sign-ins
  for (const user of users.docs) {
    const tokens = [...pushTokens[user.id]];
    if (tokens.length) write('profiles with push tokens', () => writer.set(user.ref, { pushTokens: tokens }, { merge: true }));
    if (user.get('isAdmin') === true) {
      count('admins');
      if (!dryRun) {
        const account = await auth.getUser(user.id).catch(() => null);
        if (account) await auth.setCustomUserClaims(user.id, { ...account.customClaims, admin: true });
      }
    }
  }
}

await writer.close();
for (const [what, n] of Object.entries(counts)) console.log(`  ${what}: ${n}`);
console.log(dryRun ? 'Nothing written.' : 'Done.');
process.exit(0);
