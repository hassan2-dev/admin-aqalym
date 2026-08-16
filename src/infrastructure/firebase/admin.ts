import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | null = null;

function loadServiceAccount(): ServiceAccount {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromEnv?.trim()) {
    return JSON.parse(fromEnv) as ServiceAccount;
  }

  const keyPath = resolve(process.cwd(), 'serviceAccountKey.json');
  if (!existsSync(keyPath)) {
    throw new Error(
      'مفقود serviceAccountKey.json أو FIREBASE_SERVICE_ACCOUNT_JSON',
    );
  }
  return JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;
}

export function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }
  app = initializeApp({ credential: cert(loadServiceAccount()) });
  return app;
}

export function getAdminDb(): Firestore {
  getAdminApp();
  return getFirestore();
}

export function getAdminAuth(): Auth {
  getAdminApp();
  return getAuth();
}
