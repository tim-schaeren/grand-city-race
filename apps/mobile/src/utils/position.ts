import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { paths } from '@grandcityrace/shared';
import { db } from '../firebase';

// Where a player is, written straight from the phone: the last position, for
// the hosts' live map and the team's spread check, and the trail the recap
// draws. Both carry the team, which the rules check.

export function savePosition(gameId: string, uid: string, teamId: string, lat: number, lng: number, at: number) {
	return setDoc(doc(db, paths.position(gameId, uid)), { uid, teamId, lat, lng, updatedAt: at });
}

export function addTrailPoint(gameId: string, uid: string, teamId: string, lat: number, lng: number, t: number) {
	return addDoc(collection(db, paths.trail(gameId)), { uid, teamId, lat, lng, t });
}
