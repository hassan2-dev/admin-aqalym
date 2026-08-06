'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Checkbox } from '@/presentation/components/ui/checkbox';
import { Button } from '@/presentation/components/ui/button';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useCrudMutation, useRoles } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import { ALL_PERMISSIONS, ROLE_LABELS, type Permission } from '@/domain/enums';
import type { Role } from '@/domain/entities';

const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard.view': 'عرض اللوحة',
  'orders.view': 'عرض الطلبات',
  'orders.create': 'إنشاء طلبات',
  'orders.edit': 'تعديل الطلبات',
  'orders.approve': 'اعتماد الطلبات',
  'orders.reject': 'رفض الطلبات',
  'orders.price': 'تعديل الأسعار',
  'orders.production': 'التحويل للإنتاج',
  'orders.print': 'طباعة الطلبات',
  'products.view': 'عرض المنتجات',
  'products.manage': 'إدارة المنتجات',
  'categories.manage': 'إدارة التصنيفات',
  'catalogs.manage': 'إدارة كتالوجات المواصفات',
  'variants.manage': 'إدارة المتغيرات',
  'glass.manage': 'إدارة الزجاج',
  'accessories.manage': 'إدارة الإكسسوارات',
  'services.manage': 'إدارة الخدمات',
  'customers.view': 'عرض العملاء',
  'customers.manage': 'إدارة العملاء',
  'projects.view': 'عرض المشاريع',
  'projects.manage': 'إدارة المشاريع',
  'reports.view': 'عرض التقارير',
  'users.view': 'عرض المستخدمين',
  'users.manage': 'إدارة المستخدمين',
  'roles.manage': 'إدارة الأدوار',
  'notifications.view': 'عرض الإشعارات',
  'notifications.manage': 'إدارة الإشعارات',
  'settings.manage': 'إدارة الإعدادات',
  'inventory.manage': 'إدارة المخزون',
};

export default function RolesPage() {
  const { data, isLoading, isError, refetch } = useRoles();
  const save = useCrudMutation(['roles'], dataService.saveRole);
  const [selected, setSelected] = useState<Role | null>(null);
  const [perms, setPerms] = useState<Permission[]>([]);

  useEffect(() => {
    if (data?.length && !selected) {
      setSelected(data[0]!);
      setPerms(data[0]!.permissions);
    }
  }, [data, selected]);

  useEffect(() => {
    if (selected) setPerms(selected.permissions);
  }, [selected]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError) {
    return (
      <Button onClick={() => void refetch()}>إعادة المحاولة</Button>
    );
  }

  function toggle(p: Permission) {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function onSave() {
    if (!selected) return;
    try {
      await save.mutateAsync({
        id: selected.id,
        slug: selected.slug,
        nameAr: selected.nameAr,
        name: selected.name,
        permissions: perms,
      });
      toast.success('تم حفظ صلاحيات الدور');
      const refreshed = await dataService.listRoles();
      const next = refreshed.find((r) => r.id === selected.id) ?? null;
      setSelected(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الأدوار والصلاحيات" description="تخصيص صلاحيات كل دور في النظام" />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>الأدوار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(data ?? []).map((role) => (
              <button
                key={role.id}
                onClick={() => setSelected(role)}
                className={`w-full rounded-xl px-3 py-2 text-right text-sm transition-colors ${
                  selected?.id === role.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {ROLE_LABELS[role.slug] ?? role.nameAr}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{selected ? ROLE_LABELS[selected.slug] : '—'}</CardTitle>
            <Button onClick={() => void onSave()} disabled={!selected}>
              حفظ الصلاحيات
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ALL_PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                <Checkbox checked={perms.includes(p)} onCheckedChange={() => toggle(p)} />
                {PERMISSION_LABELS[p]}
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
