import { onCall } from 'firebase-functions/v2/https';
import { copy } from '@grandcityrace/shared';
import { auth } from './lib/firebase';
import { fail, id } from './lib/input';
import { deleteAccount } from './lib/accounts';

// What only platform admins do: delete someone's account, as the privacy
// policy offers to anyone who can't do it from the app, and grant admin.
// Admin is a claim on the sign-in, which only the server can set.
export const admin = onCall(async (request) => {
  if (!request.auth) fail('unauthenticated', copy.network.signInFirst);
  if (request.auth.token.admin !== true) fail('permission-denied', copy.server.adminsOnly);
  const data = (request.data ?? {}) as Record<string, unknown>;

  // Admin is a claim on the sign-in, so the list of admins comes from the accounts
  if (data.action === 'listAdmins') {
    const uids: string[] = [];
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      page.users.forEach(u => { if (u.customClaims?.admin === true) uids.push(u.uid); });
      pageToken = page.pageToken;
    } while (pageToken);
    return { uids };
  }

  const uid = id(data.uid);

  if (data.action === 'deleteUser') {
    if (uid === request.auth.uid) fail('invalid-argument', copy.server.deleteYourself);
    return { deleted: true, ...(await deleteAccount(uid)) };
  }
  if (data.action === 'setAdmin') {
    const on = data.admin === true;
    if (!on && uid === request.auth.uid) fail('invalid-argument', copy.server.badRequest);
    const user = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, { ...user.customClaims, admin: on });
    // Takes effect at their next sign-in or token refresh, within the hour
    return { admin: on };
  }
  fail('invalid-argument', copy.server.badRequest);
});
