import { generateJoinCode, paths } from '@grandcityrace/shared';
import { db } from './firebase';

// A join code no other game has. Only the server hands them out: a code a
// host could choose would let them send another game's players to theirs.
export async function uniqueJoinCode(): Promise<string> {
  for (;;) {
    const code = generateJoinCode();
    const taken = await db.collection(paths.games()).where('joinCode', '==', code).limit(1).get();
    if (taken.empty) return code;
  }
}
