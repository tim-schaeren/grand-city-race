// Who runs a game. Finding someone by email needs every account, which hosts
// can't read, so it happens here: a host names a co-host by email and never
// sees anyone's account data.
import { FieldValue } from 'firebase-admin/firestore';
import { copy } from '@grandcityrace/shared';
import { firebase, callerUid, canManageGame, handle, HttpError } from '../lib/server.mjs';

export default (req) => handle(req, async ({ gameId, action, email, uid: hostUid }) => {
  const uid = await callerUid(req);
  const { auth, db } = firebase();
  const gameRef = db.doc(`games/${gameId ?? '_'}`);
  const game = (await gameRef.get()).data();
  if (!game) throw new HttpError(404, copy.server.noGame);
  if (!(await canManageGame(db, uid, game))) throw new HttpError(403, copy.server.hostsOnly);
  const hostIds = game.hostIds ?? [];

  if (action === 'add') {
    const wanted = String(email ?? '').trim().toLowerCase();
    if (!wanted) throw new HttpError(400, copy.server.enterEmail);
    let user;
    try {
      user = await auth.getUserByEmail(wanted);
    } catch {
      throw new HttpError(404, copy.server.noAccount);
    }
    await gameRef.update({ hostIds: FieldValue.arrayUnion(user.uid) });
  } else if (action === 'remove') {
    if (!hostIds.includes(hostUid)) throw new HttpError(404, copy.server.notAHost);
    // A game always keeps someone who can run it
    if (hostIds.length <= 1) throw new HttpError(409, copy.server.lastHost);
    await gameRef.update({ hostIds: FieldValue.arrayRemove(hostUid) });
  } else if (action !== 'list') {
    throw new HttpError(400, copy.server.badRequest);
  }

  // Names only: co-hosts see who else runs the game, not their accounts
  const ids = (await gameRef.get()).data().hostIds ?? [];
  const profiles = ids.length ? await db.getAll(...ids.map(id => db.doc(`users/${id}`))) : [];
  return {
    hosts: ids.map((id, i) => ({ uid: id, name: profiles[i]?.data()?.name ?? copy.server.aHost })),
  };
});

export const config = { path: '/api/hosts' };
