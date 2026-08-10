/**
 * Seed Firestore + Auth staff accounts for production Firebase.
 *
 * Prerequisites:
 * 1. Place serviceAccountKey.json in admin-aqalym/ (from Firebase Console)
 * 2. npm install -D firebase-admin
 * 3. npm run seed:firebase
 *
 * Default staff password: Admin@123
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import {
  SEED_ACCESSORIES,
  SEED_CATALOGS,
  SEED_CATEGORIES,
  SEED_CUSTOMERS,
  SEED_GLASS,
  SEED_INVENTORY,
  SEED_NOTIFICATIONS,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_PROJECTS,
  SEED_ROLES,
  SEED_SERVICES,
  SEED_SETTINGS,
  SEED_STAFF,
  SEED_VARIANTS,
} from '../src/infrastructure/demo/seed';

const DEFAULT_PASSWORD = 'Admin@123';
const KEY_PATH = resolve(process.cwd(), 'serviceAccountKey.json');

function initAdmin() {
  if (getApps().length) return;

  if (!existsSync(KEY_PATH)) {
    console.error(`
Missing serviceAccountKey.json

1) Firebase Console → Project Settings → Service accounts
2) Generate new private key
3) Save as: admin-aqalym/serviceAccountKey.json
`);
    process.exit(1);
  }

  const sa = JSON.parse(readFileSync(KEY_PATH, 'utf8')) as ServiceAccount;
  initializeApp({ credential: cert(sa) });
}

async function writeCollection(
  db: Firestore,
  name: string,
  rows: Array<{ id: string } & Record<string, unknown>>,
) {
  const batchSize = 400;
  let written = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const batch = db.batch();
    for (const row of chunk) {
      const { id, ...data } = row;
      batch.set(db.collection(name).doc(id), data, { merge: true });
    }
    await batch.commit();
    written += chunk.length;
  }
  console.log(`  ✓ ${name}: ${written}`);
}

async function ensureStaffAuth(
  email: string,
  password: string,
  displayName: string,
): Promise<string> {
  const auth = getAuth();
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, {
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    });
    return existing.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function main() {
  console.log('AQALYM Firebase Seed');
  console.log('====================\n');

  initAdmin();
  const db = getFirestore();

  console.log('Writing catalog data...');
  await writeCollection(db, 'roles', SEED_ROLES as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'categories', SEED_CATEGORIES as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'catalogs', SEED_CATALOGS as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'products', SEED_PRODUCTS as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'variants', SEED_VARIANTS as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'glassTypes', SEED_GLASS as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'accessories', SEED_ACCESSORIES as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'services', SEED_SERVICES as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'projects', SEED_PROJECTS as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'customers', SEED_CUSTOMERS as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'orders', SEED_ORDERS as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'notifications', SEED_NOTIFICATIONS as Array<{ id: string } & Record<string, unknown>>);
  await writeCollection(db, 'inventory', SEED_INVENTORY as Array<{ id: string } & Record<string, unknown>>);

  await db.collection('settings').doc('app').set(SEED_SETTINGS, { merge: true });
  console.log('  ✓ settings/app');

  console.log('\nCreating staff Auth users...');
  try {
    for (const seed of SEED_STAFF) {
      const uid = await ensureStaffAuth(seed.email, DEFAULT_PASSWORD, seed.name);
      const { id: _oldId, ...profile } = seed;
      await db.collection('staff').doc(uid).set(
        {
          ...profile,
          id: uid,
          status: 'active',
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      console.log(`  ✓ ${seed.email} → ${uid} (${seed.roleSlug})`);
    }
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/configuration-not-found' || code.includes('configuration')) {
      console.error(`
❌ فشل إنشاء حسابات الموظفين

البيانات (منتجات، طلبات، …) انبذرت بنجاح.
بس Authentication مو مفعّل بعد.

اطلب من صديقك:
  Firebase Console → Authentication → Get started
  → Sign-in method → فعّل Email/Password

بعدها شغّل مرة ثانية فقط:
  npm run firebase:setup
`);
      process.exit(1);
    }
    throw err;
  }

  console.log(`
Done.

Staff login (change password after first login):
  admin@aqalym.iq   / ${DEFAULT_PASSWORD}  (super_admin)
  sales@aqalym.iq   / ${DEFAULT_PASSWORD}  (sales)
  factory@aqalym.iq / ${DEFAULT_PASSWORD}  (factory)

Next:
  1) Deploy rules: firebase deploy --only firestore:rules,storage
  2) Apps already have config with DEMO_MODE=false
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
