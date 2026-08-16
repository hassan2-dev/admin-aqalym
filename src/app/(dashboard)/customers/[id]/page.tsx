'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, MapPin, Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { DataTable, Td } from '@/presentation/components/shared/data-table';
import { StatusBadge } from '@/presentation/components/shared/status-badge';
import { Button } from '@/presentation/components/ui/button';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useCustomers, useOrders } from '@/presentation/hooks/use-data';
import { formatCurrency, formatDate } from '@/shared/lib/utils';
import { orderBelongsToCustomer } from '@/shared/lib/customers';
import { Wallet, ShoppingCart } from 'lucide-react';

export default function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const customers = useCustomers();
  const orders = useOrders();
  const customer = customers.data?.find((c) => c.id === id);
  const history = customer
    ? (orders.data ?? []).filter((o) => orderBelongsToCustomer(o, customer))
    : [];

  if (customers.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!customer) return <p className="text-muted-foreground">العميل غير موجود</p>;

  const revenue = history.reduce((s, o) => s + (o.finalPrice ?? o.estimatedPrice), 0);
  const isGold = revenue > 500000 || history.length >= 3;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" /> العملاء &gt; {customer.name}
        </Link>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="accent">
            <Link href="/orders/new">
              <Plus className="h-4 w-4" /> طلب جديد للعميل
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/customers">
              <Pencil className="h-4 w-4" /> تعديل الملف
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{customer.name}</h1>
                {isGold ? (
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    عميل ذهبي
                  </span>
                ) : null}
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                {customer.notes || 'شريك استراتيجي في مشاريع الألمنيوم المعماري.'}
              </p>
              <div className="mt-4 space-y-1 text-sm">
                {customer.email ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> {customer.email}
                  </p>
                ) : null}
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {customer.governorate || '—'} — {customer.city || '—'}
                </p>
                <p className="text-muted-foreground" dir="ltr">
                  {customer.phone}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4">
          <StatCard title="القيمة مدى الحياة" value={revenue} currency icon={Wallet} trend="+12% عن العام الماضي" trendTone="success" />
          <StatCard title="إجمالي الطلبات" value={`${history.length} طلب`} icon={ShoppingCart} />
        </div>
      </div>

      <SectionCard
        title="سجل الطلبات"
        action={
          <Button variant="outline" size="sm">
            تصدير البيانات
          </Button>
        }
      >
        <DataTable
          headers={['رقم الطلب', 'تاريخ الطلب', 'الحالة', 'العناصر', 'الإجمالي']}
          empty={!history.length}
          emptyTitle="لا توجد طلبات لهذا العميل"
        >
          {history.map((o) => (
            <tr key={o.id} className="hover:bg-muted/30">
              <Td>
                <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                  {o.orderNumber}
                </Link>
              </Td>
              <Td>{formatDate(o.createdAt)}</Td>
              <Td>
                <StatusBadge status={o.status} />
              </Td>
              <Td>{o.productName}</Td>
              <Td className="font-semibold">{formatCurrency(o.finalPrice ?? o.estimatedPrice)}</Td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="ملاحظات العميل">
          <p className="text-sm text-muted-foreground">{customer.notes || 'لا توجد ملاحظات'}</p>
        </SectionCard>
        <SectionCard title="المواقع المرتبطة">
          {customer.addresses.length ? (
            <div className="space-y-2">
              {customer.addresses.map((a) => (
                <div key={a.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">{a.label}</p>
                  <p className="text-muted-foreground">
                    {a.governorate} — {a.city} — {a.address}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد عناوين محفوظة</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
