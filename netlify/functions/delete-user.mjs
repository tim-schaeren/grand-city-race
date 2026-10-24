// A platform admin deletes someone's account, as the privacy policy offers
// to anyone who can't do it from the app. It removes what deleting from the
// app does, in every game they were ever in: the account, the profile, their
// entries in games, the chat messages they wrote, and their location history.
// Their teams' progress stays; it belongs to the team. Only the server may
// delete another person's sign-in, so this runs here.
import { FieldValue } from 'firebase-admin/firestore';
import { copy } from '@grandcityrace/shared';
import { firebase, callerUid, handle, HttpError } from '../lib/server.mjs';

export default (req) => handle(req, async ({ uid: target }) => {
  const uid = await callerUid(req);
  const { auth, db } = firebase();
  const me = await db.doc(`users/${uid}`).get();
  if (!me.exists || me.data().isAdmin !== true) throw new HttpError(403, copy.server.adminsOnly);
  if (!target || typeof target !== 'string') throw new HttpError(400, copy.server.badRequest);
  if (target === uid) throw new HttpError(400, copy.server.deleteYourself);

  // Many deletes at once, without a batch's limit of 500
  const writer = db.bulkWriter();
  const remove = ref => writer.delete(ref);

  // Off their teams, and off the host lists of games they ran
  const teams = await db.collection('teams').where('memberIds', 'array-contains', target).get();
  teams.forEach(t => writer.update(t.ref, { memberIds: FieldValue.arrayRemove(target) }));
  const hosted = await db.collection('games').where('hostIds', 'array-contains', target).get();
  hosted.forEach(g => writer.update(g.ref, { hostIds: FieldValue.arrayRemove(target) }));

  // Their place in every game, and what they wrote in its chat
  const games = await db.collection('games').select().get();
  for (const game of games.docs) {
    remove(game.ref.collection('players').doc(target));
    remove(game.ref.collection('private').doc(target));
    const mine = await game.ref.collection('messages').where('authorId', '==', target).select().get();
    mine.forEach(m => remove(m.ref));
  }

  // Their location history
  const trail = await db.collection('trail').where('userId', '==', target).select().get();
  trail.forEach(p => remove(p.ref));

  remove(db.doc(`users/${target}`));
  await writer.close();

  // Last, so a failure above can be retried with the account still there
  await auth.deleteUser(target).catch(e => {
    if (e.code !== 'auth/user-not-found') throw e;
  });
  return { deleted: true, teams: teams.size, hosted: hosted.size, trail: trail.size };
});

export const config = { path: '/api/delete-user' };
