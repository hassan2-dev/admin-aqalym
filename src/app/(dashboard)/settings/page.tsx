'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Switch } from '@/presentation/components/ui/switch';
import { Button } from '@/presentation/components/ui/button';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useCrudMutation, useSettings } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import { firebaseConfig, isDemoMode } from '@/infrastructure/firebase/client';
import type { CompanySettings } from '@/domain/entities';
import { IRAQI_GOVERNORATES } from '@/shared/constants/brand';

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const save = useCrudMutation(['settings'], dataService.saveSettings);
  const [form, setForm] = useState<CompanySettings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <Skeleton className="h-96 w-full" />;

  function set<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function onSave() {
    if (!form) return;
    try {
      await save.mutateAsync(form);
      toast.success('تم حفظ الإعدادات');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإعدادات"
        description="بيانات الشركة وFirebase وتخزين الصور — OTP خاص بتطبيق الموبايل فقط"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-xl shadow-soft">
          <CardHeader>
            <CardTitle>معلومات الشركة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="اسم الشركة (عربي)">
              <Input value={form.companyNameAr} onChange={(e) => set('companyNameAr', e.target.value)} />
            </Field>
            <Field label="اسم الشركة (EN)">
              <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            </Field>
            <Field label="الهاتف">
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" className="text-left" />
            </Field>
            <Field label="البريد">
              <Input value={form.email} onChange={(e) => set('email', e.target.value)} dir="ltr" className="text-left" />
            </Field>
            <Field label="العنوان">
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="المحافظة">
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                value={form.governorate}
                onChange={(e) => set('governorate', e.target.value)}
              >
                {IRAQI_GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Firebase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              الوضع الحالي:{' '}
              <strong>{isDemoMode ? 'Demo Mode' : 'متصل بـ Firebase'}</strong>
            </p>
            <InfoRow label="Project ID" value={firebaseConfig.projectId || '—'} />
            <InfoRow label="Auth Domain" value={firebaseConfig.authDomain || '—'} />
            <InfoRow label="Messaging Sender" value={firebaseConfig.messagingSenderId || '—'} />
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              Firebase للـ Auth و Firestore فقط. تخزين الصور على Cloudflare R2 (انظر R2-SETUP.md).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OTP تطبيق الموبايل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              حالياً للتطوير: `OTP_DEV_FIXED=true` → الرمز الثابت <strong>123456</strong> بدون OTPIQ.
              للإنتاج: `OTP_DEV_FIXED=false` + `OTPIQ_API_KEY`. لوحة التحكم تبقى إيميل/باسورد.
            </p>
            <div className="flex items-center justify-between">
              <Label>تفعيل OTP (الموبايل)</Label>
              <Switch checked={form.otpEnabled} onCheckedChange={(v) => set('otpEnabled', v)} />
            </div>
            <Field label="طول الرمز">
              <Input
                type="number"
                value={form.otpLength}
                onChange={(e) => set('otpLength', Number(e.target.value))}
              />
            </Field>
            <Field label="انتهاء الصلاحية (دقائق)">
              <Input
                type="number"
                value={form.otpExpiryMinutes}
                onChange={(e) => set('otpExpiryMinutes', Number(e.target.value))}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>التخزين — Cloudflare R2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
              التخزين عبر Cloudflare R2 من السيرفر. بعد تعبئة مفاتيح R2_* في `.env.local` وإعادة التشغيل يصير رفع الصور جاهز.
            </p>
            <Field label="مجلد الرفع الافتراضي">
              <Input value={form.storageFolder} onChange={(e) => set('storageFolder', e.target.value)} />
            </Field>
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              عبّي: R2_ACCOUNT_ID ، R2_ACCESS_KEY_ID ، R2_SECRET_ACCESS_KEY ، R2_BUCKET_NAME ، R2_PUBLIC_URL
            </p>
            <div className="flex items-center justify-between">
              <Label>تفعيل FCM</Label>
              <Switch checked={form.fcmEnabled} onCheckedChange={(v) => set('fcmEnabled', v)} />
            </div>
            <Field label="العملة">
              <Input value={form.currency} onChange={(e) => set('currency', e.target.value)} />
            </Field>
            <Field label="المنطقة الزمنية">
              <Input value={form.timezone} onChange={(e) => set('timezone', e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Button onClick={() => void onSave()} className="min-w-40" variant="accent">
        حفظ الإعدادات
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span dir="ltr" className="truncate text-left font-mono text-xs">
        {value}
      </span>
    </div>
  );
}
