import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Admin access bypasses the security rules, so every action checks the
// caller itself before touching anything
if (!getApps().length) initializeApp();

export const db = getFirestore();
// Optional fields are left out of documents rather than refused
db.settings({ ignoreUndefinedProperties: true });
export const auth = getAuth();
export const storage = getStorage();
