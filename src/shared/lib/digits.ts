/** Eastern Arabic (٠-٩) and Persian (۰-۹) → Western 0-9 */
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

export function toWesternDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const i = ARABIC_INDIC.indexOf(ch);
    if (i >= 0) return String(i);
    const j = PERSIAN.indexOf(ch);
    if (j >= 0) return String(j);
    return ch;
  });
}

export function normalizeNumericInput(input: string, allowDecimal = false): string {
  const western = toWesternDigits(input);
  if (!allowDecimal) return western.replace(/[^\d]/g, '');
  let seenDot = false;
  let out = '';
  for (const ch of western) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === '.' || ch === ',') {
      if (!seenDot) {
        out += '.';
        seenDot = true;
      }
    }
  }
  return out;
}
