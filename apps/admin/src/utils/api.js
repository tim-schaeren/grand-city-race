import { httpsCallable } from 'firebase/functions';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { auth, functions } from '../firebase';

// Calls one of the server functions as the signed-in host. Errors carry the
// server's own sentence, ready to show.
async function call(fn, action, data) {
  if (!auth.currentUser) throw new Error(cc.api.signInFirst);
  try {
    const { data: result } = await httpsCallable(functions, fn)({ action, ...data });
    return result;
  } catch (e) {
    throw new Error(e?.message || cc.api.somethingWentWrongTryAgain);
  }
}

// What a game's hosts do to run it: start, pause, teams, players, coins…
export const host = (action, data) => call('host', action, data);

// What only platform admins do
export const admin = (action, data) => call('admin', action, data);
