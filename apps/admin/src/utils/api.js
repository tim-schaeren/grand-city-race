import { consoleCopy as cc } from '@grandcityrace/shared';
import { auth } from '../firebase';

// Calls one of the site's server functions as the signed-in host. Errors carry
// the server's own sentence, ready to show.
export async function callApi(path, body) {
  const user = auth.currentUser;
  if (!user) throw new Error(cc.api.signInFirst);
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? cc.api.somethingWentWrongTryAgain);
  return data;
}
