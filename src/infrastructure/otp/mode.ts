/** تطوير: رمز ثابت 123456 بدون OTPIQ. إنتاج: OTP_DEV_FIXED=false + OTPIQ_API_KEY */
export const FIXED_DEV_OTP = '123456';

export function isOtpDevFixed(): boolean {
  const raw = process.env.OTP_DEV_FIXED?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  if (raw === 'true' || raw === '1' || raw === 'on') return true;
  // افتراضي أثناء التطوير إذا ما انضبط المفتاح
  return !process.env.OTPIQ_API_KEY?.trim();
}
