import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | null = null;

function parseServiceAccountJson(raw: string): ServiceAccount {
  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    candidates.push(trimmed.slice(1, -1));
  }
  // Vercel / dotenv sometimes keep escaped newlines inside the JSON string.
  candidates.push(trimmed.replace(/\\n/g, '\n'));
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as ServiceAccount;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('FIREBASE_SERVICE_ACCOUNT_JSON غير صالح');
}

function loadServiceAccount(): ServiceAccount {
  const fromB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (fromB64) {
    return parseServiceAccountJson(Buffer.from(fromB64, 'base64').toString('utf8'));
  }

  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromEnv?.trim()) {
    return parseServiceAccountJson(fromEnv);
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
