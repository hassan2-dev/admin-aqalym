export function normalizeIraqiPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('964')) return `+${digits}`;
  if (digits.startsWith('0')) return `+964${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 10) return `+964${digits}`;
  return `+964${digits}`;
}

export function isValidIraqiPhone(input: string): boolean {
  return /^\+9647\d{9}$/.test(normalizeIraqiPhone(input));
}

export function otpSessionId(phoneE164: string): string {
  return phoneE164.replace(/\D/g, '');
}
