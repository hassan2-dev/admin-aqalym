/**
 * يضيف خدمات الرئيسية الثلاث إلى Firestore بدون مسح بقية المنتجات.
 * القياس الأولي، القياس النهائي، الصيانة والضمان.
 */
import { getAdminDb } from '../src/infrastructure/firebase/admin';
import { SEED_PRODUCTS } from '../src/infrastructure/demo/seed';

const IDS = ['svc-initial-measure', 'svc-final-measure', 'svc-maintenance'] as const;

async function main() {
  const db = getAdminDb();
  const services = SEED_PRODUCTS.filter((product) =>
    (IDS as readonly string[]).includes(product.id),
  );
  if (services.length !== IDS.length) {
    throw new Error(`المتوقع ${IDS.length} خدمات، الموجود ${services.length}`);
  }

  for (const service of services) {
    const { id, ...data } = service;
    await db.collection('products').doc(id).set(data, { merge: true });
    console.log(`ok ${id} ${service.nameAr}`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
