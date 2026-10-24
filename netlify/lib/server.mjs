// Shared by the Netlify functions: Firebase admin access, who is calling, and
// push. Admin access bypasses the security rules, so every function checks
// the caller itself before touching anything.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { copy } from '@grandcityrace/shared';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// FIREBASE_SERVICE_ACCOUNT holds the service account key as JSON, set in the
// Netlify site's environment. Locally, the emulators need no key.
export function firebase() {
  if (!getApps().length) {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'gcr26-d76cc' });
    } else {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) throw new HttpError(500, copy.server.missingKey);
      const key = JSON.parse(raw);
      initializeApp({ credential: cert(key), projectId: key.project_id });
    }
  }
  return { auth: getAuth(), db: getFirestore() };
}

// The signed-in user making the request, from their Firebase ID token
export async function callerUid(req) {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, copy.network.signInFirst);
  try {
    return (await firebase().auth.verifyIdToken(token)).uid;
  } catch {
    throw new HttpError(401, copy.network.sessionExpired);
  }
}

// Hosts listed on the game, or a platform admin — the same as canManageGame
// in firestore.rules
export async function canManageGame(db, uid, game) {
  if ((game?.hostIds ?? []).includes(uid)) return true;
  const me = await db.doc(`users/${uid}`).get();
  return me.exists && me.data().isAdmin === true;
}

// Push to some of a game's players. Tokens live on each player's private
// entry in the game; profiles fill in players on older app versions.
export async function pushToPlayers(db, gameId, uids, title, body) {
  const ids = [...new Set(uids)].filter(Boolean);
  if (!ids.length) return;
  const refs = ids.flatMap(uid => [db.doc(`games/${gameId}/private/${uid}`), db.doc(`users/${uid}`)]);
  const snaps = await db.getAll(...refs);
  const tokens = new Set();
  for (let i = 0; i < ids.length; i++) {
    const token = snaps[i * 2].data()?.pushToken ?? snaps[i * 2 + 1].data()?.pushToken;
    if (token) tokens.add(token);
  }
  if (!tokens.size) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify([...tokens].map(to => ({ to, title, body, sound: 'default' }))),
  }).catch(() => {});
}

export async function handle(req, fn) {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const body = await req.json().catch(() => ({}));
    return json(200, await fn(body));
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    console.error(e);
    return json(500, { error: copy.network.somethingWrong });
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
