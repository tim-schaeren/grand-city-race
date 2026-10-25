import { doc } from 'firebase/firestore';
import { paths } from '@grandcityrace/shared';
import { db } from '../firebase';
import { host } from './api';

export const recapRef = gameId => doc(db, paths.recap(gameId));

// The server builds the recap from everything the race left, including the
// trails; building again keeps whether players see it
export const buildAndSaveRecap = gameId => host('recap', { gameId, do: 'build' });

// Players hear about it the first time it's shown, not every time
export const showRecap = gameId => host('recap', { gameId, do: 'show' });

export const hideRecap = gameId => host('recap', { gameId, do: 'hide' });
