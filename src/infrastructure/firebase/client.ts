import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  !firebaseConfig.apiKey ||
  !firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp() {
  if (isDemoMode) return null;
  if (!app) app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth() {
  if (isDemoMode) return null;
  if (!auth) {
    const a = getFirebaseApp();
    if (!a) return null;
    try {
      auth = initializeAuth(a, { persistence: browserLocalPersistence });
    } catch {
      auth = getAuth(a);
    }
  }
  return auth;
}

export function getFirebaseDb() {
  if (isDemoMode) return null;
  if (!db) {
    const a = getFirebaseApp();
    if (!a) return null;
    db = getFirestore(a);
  }
  return db;
}

export function getFirebaseStorage() {
  if (isDemoMode) return null;
  if (!storage) {
    const a = getFirebaseApp();
    if (!a) return null;
    storage = getStorage(a);
  }
  return storage;
}

export { firebaseConfig };
