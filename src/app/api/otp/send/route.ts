import { createHash, randomInt } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { FIXED_DEV_OTP, isOtpDevFixed } from '@/infrastructure/otp/mode';
import { isOtpiqConfigured, sendOtpiqVerification } from '@/infrastructure/otp/otpiq';
import {
  isValidIraqiPhone,
  normalizeIraqiPhone,
  otpSessionId,
} from '@/infrastructure/otp/phone';

export const runtime = 'nodejs';

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  let phoneForLog = '';
  try {
    const fixed = isOtpDevFixed();
    const cooldownMs = fixed ? 5_000 : 45_000;
    if (!fixed && !isOtpiqConfigured()) {
      return NextResponse.json(
        {
          error:
            'للإنتاج: عبّي OTPIQ_API_KEY و OTP_DEV_FIXED=false في .env.local',
        },
        { status: 503 },
      );
    }

    const body = (await req.json()) as { phone?: string };
    const raw = body.phone?.trim() ?? '';
    if (!isValidIraqiPhone(raw)) {
      return NextResponse.json({ error: 'رقم هاتف عراقي غير صالح' }, { status: 400 });
    }

    const phone = normalizeIraqiPhone(raw);
    phoneForLog = phone;
    const db = getAdminDb();
    const settingsSnap = await db.collection('settings').doc('app').get();
    const settings = settingsSnap.data() as
      | { otpEnabled?: boolean; otpLength?: number; otpExpiryMinutes?: number }
      | undefined;

    if (settings?.otpEnabled === false) {
      return NextResponse.json(
        { error: 'OTP تطبيق الموبايل معطّل من الإعدادات' },
        { status: 403 },
      );
    }

    const length = fixed ? FIXED_DEV_OTP.length : Math.min(8, Math.max(4, settings?.otpLength ?? 6));
    const expiryMinutes = Math.min(30, Math.max(1, settings?.otpExpiryMinutes ?? 5));
    const sessionRef = db.collection('otpSessions').doc(otpSessionId(phone));
    const rateRef = db.collection('otpRate').doc(otpSessionId(phone));
    const now = new Date();
    const hourMs = 60 * 60 * 1000;
    let hourlyCount = 0;
    let windowStartIso = now.toISOString();

    if (!fixed) {
      const rateSnap = await rateRef.get();
      if (rateSnap.exists) {
        const start = new Date(String(rateSnap.data()?.windowStart)).getTime();
        if (Number.isFinite(start) && now.getTime() - start < hourMs) {
          hourlyCount = Number(rateSnap.data()?.count) || 0;
          windowStartIso = String(rateSnap.data()?.windowStart);
          if (hourlyCount >= 3) {
            const retryMin = Math.max(1, Math.ceil((hourMs - (now.getTime() - start)) / 60_000));
            return NextResponse.json(
              {
                error: `هذا الرقم استنفد 3 رسائل بهالساعة. حاول بعد ${retryMin} دقيقة`,
                retryAfterSec: retryMin * 60,
              },
              { status: 429 },
            );
          }
        }
      }
    }

    const existing = await sessionRef.get();
    if (existing.exists) {
      const lastSentAt = existing.data()?.sentAt as string | undefined;
      if (lastSentAt) {
        const elapsed = Date.now() - new Date(lastSentAt).getTime();
        if (elapsed < cooldownMs) {
          return NextResponse.json(
            {
              error: 'انتظر قليلاً قبل إعادة الإرسال',
              retryAfterSec: Math.ceil((cooldownMs - elapsed) / 1000),
            },
            { status: 429 },
          );
        }
      }
    }

    const code = fixed
      ? FIXED_DEV_OTP
      : String(randomInt(0, 10 ** length)).padStart(length, '0');
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60_000).toISOString();

    let smsId: string | undefined;
    if (!fixed) {
      ({ smsId } = await sendOtpiqVerification({ phoneE164: phone, code }));
    }

    await sessionRef.set({
      phone,
      codeHash: hashCode(code),
      attempts: 0,
      maxAttempts: 5,
      sentAt: now.toISOString(),
      expiresAt,
      smsId: smsId ?? null,
      provider: fixed ? 'dev-fixed' : (process.env.OTPIQ_PROVIDER ?? 'whatsapp-telegram-sms'),
      fixedDev: fixed,
    });

    if (!fixed) {
      await rateRef.set({
        phone,
        count: hourlyCount + 1,
        windowStart: windowStartIso,
        updatedAt: now.toISOString(),
      });
    }

    await db.collection('otpLogs').add({
      phone,
      purpose: 'login',
      success: true,
      smsId: smsId ?? null,
      fixedDev: fixed,
      createdAt: now.toISOString(),
    });

    return NextResponse.json({
      ok: true,
      phone,
      expiresAt,
      length,
      ...(fixed ? { devFixed: true, hint: FIXED_DEV_OTP } : {}),
    });
  } catch (e) {
    console.error('[otp/send]', e);
    if (phoneForLog) {
      try {
        await getAdminDb().collection('otpLogs').add({
          phone: phoneForLog,
          purpose: 'login',
          success: false,
          error: e instanceof Error ? e.message : 'send_failed',
          createdAt: new Date().toISOString(),
        });
      } catch {
        // ignore
      }
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'فشل إرسال OTP' },
      { status: 500 },
    );
  }
}
