'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Button } from '@/presentation/components/ui/button';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useCrudMutation, useSettings } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
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
      toast.success('تم حفظ المعلومات');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" description="معلومات الشركة التي تظهر للعملاء" />

      <Card className="max-w-2xl rounded-xl shadow-soft">
        <CardHeader>
          <CardTitle>معلومات الشركة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="اسم الشركة">
            <Input value={form.companyNameAr} onChange={(e) => set('companyNameAr', e.target.value)} />
          </Field>
          <Field label="الاسم بالإنجليزي">
            <Input
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </Field>
          <Field label="الهاتف">
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </Field>
          <Field label="البريد">
            <Input
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              dir="ltr"
              className="text-left"
            />
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
          <Button onClick={() => void onSave()} className="min-w-40" variant="accent">
            حفظ المعلومات
          </Button>
        </CardContent>
      </Card>
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
