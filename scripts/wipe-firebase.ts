/**
 * Clears Firestore business data. Keeps staff Auth users + staff docs + roles.
 * Usage: npm run firebase:wipe
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { SEED_ROLES, SEED_SETTINGS } from '../src/infrastructure/demo/seed';

const KEY_PATH = resolve(process.cwd(), 'serviceAccountKey.json');

const WIPE_COLLECTIONS = [
  'categories',
  'catalogs',
  'products',
  'variants',
  'glassTypes',
  'accessories',
  'services',
  'projects',
  'customers',
  'orders',
  'orderItems',
  'notifications',
  'inventory',
  'users',
  'otpLogs',
  'otpSessions',
] as const;

function initAdmin() {
  if (getApps().length) return;
  if (!existsSync(KEY_PATH)) {
    console.error('Missing serviceAccountKey.json');
    process.exit(1);
  }
  const sa = JSON.parse(readFileSync(KEY_PATH, 'utf8')) as ServiceAccount;
  initializeApp({ credential: cert(sa) });
}

async function deleteCollection(db: Firestore, name: string) {
  const col = db.collection(name);
  let total = 0;
  for (;;) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    total += snap.size;
  }
  console.log(`  ✓ wiped ${name}: ${total}`);
}

async function main() {
  initAdmin();
  const db = getFirestore();

  console.log('\nAQALYM Firebase Wipe\n====================\n');
  console.log('Deleting business collections...\n');

  for (const name of WIPE_COLLECTIONS) {
    await deleteCollection(db, name);
  }

  console.log('\nRestoring minimal roles + settings...\n');
  for (const role of SEED_ROLES) {
    const { id, ...data } = role;
    await db.collection('roles').doc(id).set(data, { merge: true });
  }
  console.log(`  ✓ roles: ${SEED_ROLES.length}`);

  await db.collection('settings').doc('app').set(
    {
      ...SEED_SETTINGS,
      otpEnabled: true,
      otpLength: 6,
      otpExpiryMinutes: 5,
    },
    { merge: true },
  );
  console.log('  ✓ settings/app');

  console.log(`
Done. Staff accounts unchanged:
  admin@aqalym.iq / Admin@123
  sales@aqalym.iq / Admin@123
  factory@aqalym.iq / Admin@123
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
