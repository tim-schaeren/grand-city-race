import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// What only a player and their game's hosts may read: last position and push
// token. Every player in a game can read the game's player list (that is how
// the team picker names who is in each team), so these never go there.
function privateRef(gameId: string, uid: string) {
	return doc(db, 'games', gameId, 'private', uid);
}

export function savePosition(
	gameId: string,
	uid: string,
	position: { lat: number; lng: number; updatedAt: number },
) {
	return setDoc(privateRef(gameId, uid), { lastLocation: position }, { merge: true });
}

export function savePushToken(gameId: string, uid: string, pushToken: string) {
	return setDoc(privateRef(gameId, uid), { pushToken }, { merge: true });
}

export function removePrivateEntry(gameId: string, uid: string) {
	return deleteDoc(privateRef(gameId, uid));
}
