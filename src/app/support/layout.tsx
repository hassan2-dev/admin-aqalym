import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'دعم أقاليم | Aqalym Support',
  description:
    'صفحة دعم تطبيق أقاليم — تواصل معنا عبر البريد الإلكتروني أو الهاتف. Aqalym app support and contact information.',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
