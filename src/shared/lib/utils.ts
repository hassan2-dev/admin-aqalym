import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toWesternDigits } from '@/shared/lib/digits';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIqdNumber(value: number): string {
  const n = Math.round(Math.abs(Number(value) || 0));
  const grouped = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return value < 0 ? `-${grouped}` : grouped;
}

export function parseIqdDigits(raw: string): string {
  return toWesternDigits(String(raw ?? '')).replace(/[^\d]/g, '');
}

export function parseIqdNumber(raw: string): number {
  const digits = parseIqdDigits(raw);
  return digits ? Number(digits) : 0;
}

export function formatIqdInput(raw: string): string {
  const digits = parseIqdDigits(raw);
  if (!digits) return '';
  return formatIqdNumber(Number(digits));
}

export function formatCurrency(value: number) {
  return `${formatIqdNumber(value)} د.ع`;
}

export function formatDate(value: string | Date, locale = 'ar-IQ') {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date, locale = 'ar-IQ') {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
