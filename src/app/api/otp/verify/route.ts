import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getAdminAuth, getAdminDb } from '@/infrastructure/firebase/admin';
import {
  isValidIraqiPhone,
  normalizeIraqiPhone,
  otpSessionId,
} from '@/infrastructure/otp/phone';

export const runtime = 'nodejs';

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

async function getOrCreatePhoneUser(phone: string) {
  const auth = getAdminAuth();
  try {
    return await auth.getUserByPhoneNumber(phone);
  } catch (e: unknown) {
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found') {
      return auth.createUser({ phoneNumber: phone });
    }
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { phone?: string; code?: string };
    const rawPhone = body.phone?.trim() ?? '';
    const code = body.code?.trim() ?? '';

    if (!isValidIraqiPhone(rawPhone)) {
      return NextResponse.json({ error: 'رقم هاتف عراقي غير صالح' }, { status: 400 });
    }
    if (!/^\d{4,8}$/.test(code)) {
      return NextResponse.json({ error: 'رمز غير صالح' }, { status: 400 });
    }

    const phone = normalizeIraqiPhone(rawPhone);
    const db = getAdminDb();
    const sessionRef = db.collection('otpSessions').doc(otpSessionId(phone));
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      return NextResponse.json({ error: 'لا يوجد رمز معلّق لهذا الرقم' }, { status: 400 });
    }

    const session = sessionSnap.data()!;
    const expiresAt = new Date(String(session.expiresAt)).getTime();
    if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
      await sessionRef.delete();
      return NextResponse.json({ error: 'انتهت صلاحية الرمز' }, { status: 400 });
    }

    const attempts = Number(session.attempts ?? 0);
    const maxAttempts = Number(session.maxAttempts ?? 5);
    if (attempts >= maxAttempts) {
      await sessionRef.delete();
      return NextResponse.json({ error: 'تجاوزت عدد المحاولات' }, { status: 429 });
    }

    if (hashCode(code) !== session.codeHash) {
      await sessionRef.update({ attempts: attempts + 1 });
      return NextResponse.json({ error: 'رمز غير صحيح' }, { status: 401 });
    }

    await sessionRef.delete();

    const fbUser = await getOrCreatePhoneUser(phone);
    const now = new Date().toISOString();
    const userRef = db.collection('users').doc(fbUser.uid);
    const customerRef = db.collection('customers').doc(fbUser.uid);
    const [existingUser, existingCustomer] = await Promise.all([userRef.get(), customerRef.get()]);
    const existing = existingUser.data() as
      | {
          name?: string;
          governorate?: string;
          city?: string;
          address?: string;
          createdAt?: string;
        }
      | undefined;
    const prevCustomer = existingCustomer.data() as
      | { name?: string; governorate?: string; city?: string; addresses?: unknown[]; createdAt?: string }
      | undefined;

    const profile = {
      id: fbUser.uid,
      phone,
      name: existing?.name || prevCustomer?.name || '',
      governorate: existing?.governorate || prevCustomer?.governorate || '',
      city: existing?.city || prevCustomer?.city || '',
      address: existing?.address || '',
      updatedAt: now,
      createdAt: existing?.createdAt ?? prevCustomer?.createdAt ?? now,
    };

    await userRef.set(profile, { merge: true });
    await customerRef.set(
      {
        name: profile.name || 'حساب تطبيق',
        phone,
        governorate: profile.governorate,
        city: profile.city,
        addresses: prevCustomer?.addresses ?? [],
        notes: 'حساب من تطبيق أقاليم',
        updatedAt: now,
        createdAt: profile.createdAt,
      },
      { merge: true },
    );

    const token = await getAdminAuth().createCustomToken(fbUser.uid, {
      role: 'customer',
    });

    return NextResponse.json({
      ok: true,
      token,
      user: profile,
    });
  } catch (e) {
    console.error('[otp/verify]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'فشل التحقق من OTP' },
      { status: 500 },
    );
  }
}
