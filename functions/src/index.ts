/**
 * OTP عبر OTPIQ داخل Firebase — بدون سيرفر أدمن.
 *
 * أول نشر:
 *   firebase login
 *   firebase functions:secrets:set OTPIQ_API_KEY
 *   npm --prefix functions install
 *   firebase deploy --only functions
 *
 * يحتاج خطة Blaze. المفتاح يبقى سر وما يدخل تطبيق الموبايل.
 */
import { createHash, randomInt } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';

import { sendOtpiqVerification, type OtpiqProvider } from './otpiq';
import { isValidIraqiPhone, normalizeIraqiPhone, otpSessionId } from './phone';

initializeApp();

const REGION = 'europe-west1';
const otpiqApiKey = defineSecret('OTPIQ_API_KEY');
const otpiqProvider = defineString('OTPIQ_PROVIDER', {
  default: 'whatsapp-telegram-sms',
});

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function asHttpsError(e: unknown): never {
  if (e instanceof HttpsError) throw e;
  const message = e instanceof Error ? e.message : 'فشل العملية';
  throw new HttpsError('internal', message);
}

const callOptions = {
  region: REGION,
  cors: true,
  invoker: 'public' as const,
  timeoutSeconds: 30,
};

export const sendOtp = onCall(
  { ...callOptions, secrets: [otpiqApiKey] },
  async (request) => {
    let phoneForLog = '';
    const db = getFirestore();
    try {
      const apiKey = otpiqApiKey.value().trim();
      if (!apiKey) {
        throw new HttpsError(
          'failed-precondition',
          'OTPIQ_API_KEY غير مضبوط. شغّل: firebase functions:secrets:set OTPIQ_API_KEY',
        );
      }

      const raw = String(
        (request.data as { phone?: unknown } | undefined)?.phone ?? '',
      ).trim();
      if (!isValidIraqiPhone(raw)) {
        throw new HttpsError('invalid-argument', 'رقم هاتف عراقي غير صالح');
      }

      const phone = normalizeIraqiPhone(raw);
      phoneForLog = phone;

      const settingsSnap = await db.collection('settings').doc('app').get();
      const settings = settingsSnap.data() as
        | { otpEnabled?: boolean; otpLength?: number; otpExpiryMinutes?: number }
        | undefined;

      if (settings?.otpEnabled === false) {
        throw new HttpsError('failed-precondition', 'OTP تطبيق الموبايل معطّل من الإعدادات');
      }

      const length = Math.min(8, Math.max(4, settings?.otpLength ?? 6));
      const expiryMinutes = Math.min(30, Math.max(1, settings?.otpExpiryMinutes ?? 5));
      const cooldownMs = 45_000;
      const sessionRef = db.collection('otpSessions').doc(otpSessionId(phone));
      const rateRef = db.collection('otpRate').doc(otpSessionId(phone));
      const now = new Date();
      const hourMs = 60 * 60 * 1000;
      let hourlyCount = 0;
      let windowStartIso = now.toISOString();

      const rateSnap = await rateRef.get();
      if (rateSnap.exists) {
        const start = new Date(String(rateSnap.data()?.windowStart)).getTime();
        if (Number.isFinite(start) && now.getTime() - start < hourMs) {
          hourlyCount = Number(rateSnap.data()?.count) || 0;
          windowStartIso = String(rateSnap.data()?.windowStart);
          if (hourlyCount >= 3) {
            const retryMin = Math.max(1, Math.ceil((hourMs - (now.getTime() - start)) / 60_000));
            throw new HttpsError(
              'resource-exhausted',
              `هذا الرقم استنفد 3 رسائل بهالساعة. حاول بعد ${retryMin} دقيقة`,
            );
          }
        }
      }

      const existing = await sessionRef.get();
      if (existing.exists) {
        const lastSentAt = existing.data()?.sentAt as string | undefined;
        if (lastSentAt) {
          const elapsed = Date.now() - new Date(lastSentAt).getTime();
          if (elapsed < cooldownMs) {
            throw new HttpsError('resource-exhausted', 'انتظر قليلاً قبل إعادة الإرسال');
          }
        }
      }

      const code = String(randomInt(0, 10 ** length)).padStart(length, '0');
      const expiresAt = new Date(now.getTime() + expiryMinutes * 60_000).toISOString();
      const provider = (otpiqProvider.value() as OtpiqProvider) || 'whatsapp-telegram-sms';

      const { smsId } = await sendOtpiqVerification({
        apiKey,
        phoneE164: phone,
        code,
        provider,
      });

      await sessionRef.set({
        phone,
        codeHash: hashCode(code),
        attempts: 0,
        maxAttempts: 5,
        sentAt: now.toISOString(),
        expiresAt,
        smsId: smsId ?? null,
        provider,
        fixedDev: false,
      });

      await rateRef.set({
        phone,
        count: hourlyCount + 1,
        windowStart: windowStartIso,
        updatedAt: now.toISOString(),
      });

      await db.collection('otpLogs').add({
        phone,
        purpose: 'login',
        success: true,
        smsId: smsId ?? null,
        fixedDev: false,
        createdAt: now.toISOString(),
      });

      return { ok: true, phone, expiresAt, length };
    } catch (e) {
      if (phoneForLog) {
        try {
          await db.collection('otpLogs').add({
            phone: phoneForLog,
            purpose: 'login',
            success: false,
            error: e instanceof Error ? e.message : 'send_failed',
            createdAt: new Date().toISOString(),
          });
        } catch {
          // ignore log failures
        }
      }
      asHttpsError(e);
    }
  },
);

export const verifyOtp = onCall(callOptions, async (request) => {
  try {
    const data = (request.data ?? {}) as { phone?: unknown; code?: unknown };
    const rawPhone = String(data.phone ?? '').trim();
    const code = String(data.code ?? '').trim();

    if (!isValidIraqiPhone(rawPhone)) {
      throw new HttpsError('invalid-argument', 'رقم هاتف عراقي غير صالح');
    }
    if (!/^\d{4,8}$/.test(code)) {
      throw new HttpsError('invalid-argument', 'رمز غير صالح');
    }

    const phone = normalizeIraqiPhone(rawPhone);
    const db = getFirestore();
    const auth = getAuth();
    const sessionRef = db.collection('otpSessions').doc(otpSessionId(phone));
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      throw new HttpsError('not-found', 'لا يوجد رمز معلّق لهذا الرقم');
    }

    const session = sessionSnap.data()!;
    const expiresAt = new Date(String(session.expiresAt)).getTime();
    if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
      await sessionRef.delete();
      throw new HttpsError('deadline-exceeded', 'انتهت صلاحية الرمز');
    }

    const attempts = Number(session.attempts ?? 0);
    const maxAttempts = Number(session.maxAttempts ?? 5);
    if (attempts >= maxAttempts) {
      await sessionRef.delete();
      throw new HttpsError('resource-exhausted', 'تجاوزت عدد المحاولات');
    }

    if (hashCode(code) !== session.codeHash) {
      await sessionRef.update({ attempts: attempts + 1 });
      throw new HttpsError('invalid-argument', 'رمز غير صحيح');
    }

    await sessionRef.delete();

    let fbUser;
    try {
      fbUser = await auth.getUserByPhoneNumber(phone);
    } catch (e: unknown) {
      const errCode =
        typeof e === 'object' && e && 'code' in e ? String((e as { code: string }).code) : '';
      if (errCode !== 'auth/user-not-found') throw e;
      fbUser = await auth.createUser({ phoneNumber: phone });
    }

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
      | {
          name?: string;
          governorate?: string;
          city?: string;
          addresses?: unknown[];
          createdAt?: string;
        }
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

    const token = await auth.createCustomToken(fbUser.uid, { role: 'customer' });
    return { ok: true, token, user: profile };
  } catch (e) {
    asHttpsError(e);
  }
});
