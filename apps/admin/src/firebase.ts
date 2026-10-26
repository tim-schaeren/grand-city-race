import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

declare global { var __emulatorConnected: boolean | undefined; }

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(config);

export const db = getFirestore(app);
export const auth = getAuth(app);
// The server functions run next to the database, in Belgium
export const functions = getFunctions(app, 'europe-west1');
export const storage = getStorage(app);

// The emulators run on the computer serving the console, so a phone on the
// same network that opened it by the computer's address finds them there too
if (import.meta.env.DEV && !globalThis.__emulatorConnected) {
  globalThis.__emulatorConnected = true;
  const host = window.location.hostname;
  connectFirestoreEmulator(db, host, 8080);
  connectAuthEmulator(auth, `http://${host}:9099`);
  connectFunctionsEmulator(functions, host, 5001);
  connectStorageEmulator(storage, host, 9198);
}
