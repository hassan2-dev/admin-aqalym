/**
 * One-command Firebase setup after your friend sends:
 * - serviceAccountKey.json  (place in admin-aqalym/)
 * - web config values        (you paste into .env files)
 *
 * Creates ALL collections, fields, seed data, and staff Auth users.
 * Does NOT need friend to create any collections manually.
 *
 * Usage: npm run firebase:setup
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const keyPath = resolve(process.cwd(), 'serviceAccountKey.json');
const envLocal = resolve(process.cwd(), '.env.local');

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

console.log(`
╔══════════════════════════════════════╗
║   AQALYM — Firebase Setup (أنت)      ║
╚══════════════════════════════════════╝
`);

if (!existsSync(keyPath)) {
  fail(
    `مفقود: serviceAccountKey.json\n` +
      `حط الملف اللي صديقك أعطاك إياه هنا:\n  ${keyPath}\n\n` +
      `شوف ملف: لصديقك-Firebase.md`,
  );
}

if (!existsSync(envLocal)) {
  fail(
    `مفقود: .env.local\n` +
      `انسخ .env.example إلى .env.local والصق كونفك Firebase\n` +
      `وخلّ NEXT_PUBLIC_DEMO_MODE=false`,
  );
}

const envText = readFileSync(envLocal, 'utf8');
const needs = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];
for (const key of needs) {
  const re = new RegExp(`^${key}=(.+)$`, 'm');
  const m = envText.match(re);
  if (!m || !m[1]!.trim() || m[1]!.includes('your_')) {
    fail(`عبّي ${key} في .env.local أولاً (من كونفك صديقك)`);
  }
}
if (!/NEXT_PUBLIC_DEMO_MODE=false/.test(envText)) {
  console.warn('⚠  تأكد أن NEXT_PUBLIC_DEMO_MODE=false في .env.local');
}

console.log('✓ serviceAccountKey.json موجود');
console.log('✓ .env.local موجود');
console.log('\n→ تشغيل بذر البيانات والحقول...\n');

await import('./seed-firebase');
