'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Button } from '@/presentation/components/ui/button';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { Badge } from '@/presentation/components/ui/badge';
import { useRoles } from '@/presentation/hooks/use-data';
import { ALL_PERMISSIONS, ROLE_LABELS, type Permission, type RoleSlug } from '@/domain/enums';
import { DEFAULT_ROLE_PERMISSIONS } from '@/shared/constants/permissions';
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

function permissionsFor(role: Role): Permission[] {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role.slug as RoleSlug];
  return defaults ?? role.permissions;
}

export default function RolesPage() {
  const { data, isLoading, isError, refetch } = useRoles();
  const [selected, setSelected] = useState<Role | null>(null);

  useEffect(() => {
    if (data?.length && !selected) setSelected(data[0]!);
  }, [data, selected]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError) {
    return <Button onClick={() => void refetch()}>إعادة المحاولة</Button>;
  }

  const activePerms = selected ? new Set(permissionsFor(selected)) : new Set<Permission>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="الأدوار والصلاحيات"
        description="صلاحيات ثابتة حسب الدور — للعرض فقط ولا يمكن تعديلها من هنا"
      />

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          الصلاحيات افتراضية ومقفلة لكل دور (مبيعات، مصنع، مشرف…). لتغيير صلاحية موظف غيّر{' '}
          <strong>دوره</strong> من صفحة المستخدمين، لا تعدّل قائمة الصلاحيات.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>الأدوار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(data ?? []).map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelected(role)}
                className={`w-full rounded-xl px-3 py-2 text-right text-sm transition-colors ${
                  selected?.id === role.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {ROLE_LABELS[role.slug] ?? role.nameAr}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{selected ? ROLE_LABELS[selected.slug] : '—'}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {activePerms.size} صلاحية افتراضية · للقراءة فقط
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              مقفل
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ALL_PERMISSIONS.map((p) => {
              const on = activePerms.has(p);
              return (
                <div
                  key={p}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    on
                      ? 'border-accent/30 bg-accent/5 text-foreground'
                      : 'border-border/60 bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{PERMISSION_LABELS[p]}</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        on ? 'text-accent' : 'text-muted-foreground'
                      }`}
                    >
                      {on ? 'مفعّل' : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
