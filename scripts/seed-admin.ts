/**
 * Seed script for admin roles/staff when connected to Firebase.
 * Usage: npx tsx scripts/seed-admin.ts
 *
 * In Demo Mode the app already seeds locally — this script is for production Firebase.
 */
import { SEED_ROLES, SEED_STAFF, SEED_SETTINGS } from '../src/infrastructure/demo/seed';

async function main() {
  console.log('AQALYM Admin Seed');
  console.log('=================');
  console.log(`Roles: ${SEED_ROLES.length}`);
  SEED_ROLES.forEach((r) => console.log(` - ${r.slug}: ${r.permissions.length} permissions`));
  console.log(`Staff: ${SEED_STAFF.length}`);
  SEED_STAFF.forEach((s) => console.log(` - ${s.email} (${s.roleSlug})`));
  console.log('Default password for demo accounts: Admin@123');
  console.log('Company:', SEED_SETTINGS.companyNameAr);
  console.log('\nTo push to Firestore, configure Firebase Admin SDK and extend this script.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
