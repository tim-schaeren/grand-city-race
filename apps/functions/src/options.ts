import { setGlobalOptions } from 'firebase-functions/v2';

// Next to the database, which is in Firestore's Europe multi-region (eur3).
// A module of its own, imported first: imports run before the code around
// them, so set anywhere else this would come after the functions are defined.
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });
