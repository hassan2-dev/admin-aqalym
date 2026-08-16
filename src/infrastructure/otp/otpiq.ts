export type OtpiqProvider =
  | 'auto'
  | 'whatsapp-sms'
  | 'telegram-sms'
  | 'whatsapp-telegram-sms'
  | 'sms'
  | 'whatsapp'
  | 'telegram';

export function isOtpiqConfigured(): boolean {
  return Boolean(process.env.OTPIQ_API_KEY?.trim());
}

/** International format without +: 9647XXXXXXXXX */
export function toOtpiqPhone(e164OrLocal: string): string {
  const digits = e164OrLocal.replace(/\D/g, '');
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  if (digits.startsWith('7')) return `964${digits}`;
  return digits;
}

export async function sendOtpiqVerification(params: {
  phoneE164: string;
  code: string;
  provider?: OtpiqProvider;
}): Promise<{ smsId?: string }> {
  const apiKey = process.env.OTPIQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OTPIQ_API_KEY غير مضبوط في .env.local');
  }

  const provider =
    (process.env.OTPIQ_PROVIDER as OtpiqProvider | undefined) ??
    params.provider ??
    'whatsapp-telegram-sms';

  const res = await fetch('https://api.otpiq.com/api/sms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumber: toOtpiqPhone(params.phoneE164),
      smsType: 'verification',
      verificationCode: params.code,
      provider,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    smsId?: string;
    id?: string;
  };

  if (!res.ok) {
    throw new Error(
      body.message || body.error || `OTPIQ فشل (${res.status})`,
    );
  }

  return { smsId: body.smsId ?? body.id };
}
