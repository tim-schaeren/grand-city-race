import { FieldValue } from 'firebase-admin/firestore';
import { paths } from '@grandcityrace/shared';
import { db, auth } from './firebase';

// Deletes an account and what it left in every game it was ever in: its
// place on teams and player lists, its last position, the chat messages it
// wrote, its location history, its profile and its sign-in. Teams keep their
// progress; it belongs to the team. Used from the app, and by admins for
// anyone who can't do it there.
export async function deleteAccount(uid: string) {
  // Many deletes at once, without a batch's limit of 500
  const writer = db.bulkWriter();

  const memberships = await db.collectionGroup('players').where('uid', '==', uid).get();
  for (const entry of memberships.docs) {
    const gameId = entry.ref.parent.parent!.id;
    const teamId = entry.get('teamId') as string | null;
    if (teamId) writer.update(db.doc(paths.team(gameId, teamId)), { memberIds: FieldValue.arrayRemove(uid) });
    writer.delete(entry.ref);
    writer.delete(db.doc(paths.position(gameId, uid)));
  }

  const hosted = await db.collection(paths.games()).where('hostIds', 'array-contains', uid).get();
  hosted.forEach(g => writer.update(g.ref, { hostIds: FieldValue.arrayRemove(uid) }));

  const messages = await db.collectionGroup('messages').where('authorId', '==', uid).select().get();
  messages.forEach(m => writer.delete(m.ref));
  const trail = await db.collectionGroup('trail').where('uid', '==', uid).select().get();
  trail.forEach(p => writer.delete(p.ref));

  writer.delete(db.doc(paths.user(uid)));
  await writer.close();

  // Last, so a failure above can be retried with the account still there
  await auth.deleteUser(uid).catch((e: { code?: string }) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });
  return { games: memberships.size, hosted: hosted.size, trail: trail.size };
}
