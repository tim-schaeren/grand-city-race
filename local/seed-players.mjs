import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword, signOut, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const auth = initializeAuth(app, { persistence: inMemoryPersistence });
const db = getFirestore(app);

connectFirestoreEmulator(db, 'localhost', 8080);
connectAuthEmulator(auth, 'http://localhost:9099');

const players = [
  { name: 'Sherlock Holmes',   email: 'sherlock@221b.co.uk',         password: 'sherlock'  },
  { name: 'Indiana Jones',     email: 'indy@archaeology.edu',         password: 'indiana'   },
  { name: 'Lara Croft',        email: 'lara@tombraider.com',          password: 'lara123'   },
  { name: 'Jack Sparrow',      email: 'captain@blackpearl.com',       password: 'captain'   },
  { name: 'Hermione Granger',  email: 'hermione@hogwarts.ac.uk',      password: 'hermione'  },
  { name: 'Tony Stark',        email: 'tony@stark.industries',        password: 'tony123'   },
  { name: 'MacGyver',          email: 'mac@phoenix.foundation',       password: 'macgyver'  },
  { name: 'Walter White',      email: 'walter@laundromat.com',        password: 'walter'    },
  { name: 'Ron Swanson',       email: 'ron@pawnee.gov',               password: 'swanson'   },
  { name: 'Katniss Everdeen',  email: 'katniss@district12.gov',       password: 'katniss'   },
  { name: 'Ada Admin',         email: 'admin@grandcityrace.test',     password: 'admin123', admin: true },
];

for (const p of players) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, p.email, p.password);
    await setDoc(doc(db, 'users', user.uid), { name: p.name, email: p.email, createdAt: Date.now() });
    // Platform admin is a claim on the sign-in, which the emulator lets the owner set
    if (p.admin) {
      await fetch(`http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/${process.env.VITE_FIREBASE_PROJECT_ID}/accounts:update`, {
        method: 'POST',
        headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: user.uid, customAttributes: JSON.stringify({ admin: true }) }),
      });
    }
    await signOut(auth);
    console.log(`✓  ${p.name.padEnd(20)} ${p.email}  (password: ${p.password})${p.admin ? '  admin' : ''}`);
  } catch (e) {
    console.error(`✗  ${p.name}: ${e.message}`);
  }
}

console.log('\nDone.');
process.exit(0);

// Run from apps/admin/ with the emulator running:
//   node --env-file=.env ../../local/seed-players.mjs
