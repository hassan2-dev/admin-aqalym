'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { ChartCard } from '@/presentation/components/shared/chart-card';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { Button } from '@/presentation/components/ui/button';
import { useCustomers, useOrders, useProducts } from '@/presentation/hooks/use-data';
import { downloadCsv, formatCurrency } from '@/shared/lib/utils';
import { ORDER_STATUS_LABELS } from '@/domain/enums';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { BRAND } from '@/shared/constants/brand';
import { ar } from '@/presentation/i18n/ar';

export default function ReportsPage() {
  const orders = useOrders();
  const products = useProducts();
  const customers = useCustomers();
  const [tab, setTab] = useState('sales');

  const salesByMonth = useMemo(() => {
    const map = new Map<string, number>();
    (orders.data ?? []).forEach((o) => {
      const key = o.createdAt.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + (o.finalPrice ?? o.estimatedPrice));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [orders.data]);

  const ordersByStatus = useMemo(() => {
    return Object.entries(ORDER_STATUS_LABELS).map(([status, name]) => ({
      name,
      value: (orders.data ?? []).filter((o) => o.status === status).length,
    }));
  }, [orders.data]);

  if (orders.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <PageHeader title={ar.reports} description="تقارير المبيعات والطلبات والمنتجات والعملاء والإيرادات" />

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'sales', label: 'المبيعات' },
          { id: 'orders', label: 'الطلبات' },
          { id: 'products', label: 'المنتجات' },
          { id: 'customers', label: 'العملاء' },
          { id: 'revenue', label: 'الإيرادات' },
        ].map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
        <Button
          variant="accent"
          size="sm"
          className="ms-auto"
          onClick={() => {
            if (tab === 'sales' || tab === 'revenue') {
              downloadCsv(
                'sales-report.csv',
                (orders.data ?? []).map((o) => ({
                  orderNumber: o.orderNumber,
                  customer: o.customerName,
                  product: o.productName,
                  status: ORDER_STATUS_LABELS[o.status],
                  amount: o.finalPrice ?? o.estimatedPrice,
                  date: o.createdAt,
                }))
              );
            } else if (tab === 'products') {
              downloadCsv(
                'products-report.csv',
                (products.data ?? []).map((p) => ({
                  name: p.nameAr,
                  price: p.estimatedPrice,
                  category: p.categorySlug,
                }))
              );
            } else if (tab === 'customers') {
              downloadCsv(
                'customers-report.csv',
                (customers.data ?? []).map((c) => ({
                  name: c.name,
                  phone: c.phone,
                  governorate: c.governorate,
                }))
              );
            } else {
              downloadCsv(
                'orders-report.csv',
                (orders.data ?? []).map((o) => ({
                  orderNumber: o.orderNumber,
                  status: ORDER_STATUS_LABELS[o.status],
                  date: o.createdAt,
                }))
              );
            }
          }}
        >
          {ar.exportCsv}
        </Button>
      </div>

      {(tab === 'sales' || tab === 'revenue') && (
        <ChartCard title={tab === 'sales' ? 'تقرير المبيعات' : 'تقرير الإيرادات'} empty={!salesByMonth.length}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis width={80} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Line type="monotone" dataKey="value" stroke={BRAND.chart.primary} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {tab === 'orders' && (
        <ChartCard title="تقرير الطلبات حسب الحالة" empty={!ordersByStatus.some((x) => x.value > 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ordersByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={BRAND.chart.accent} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {tab === 'products' && (
        <SectionCard title="تقرير المنتجات">
          <ul className="space-y-2">
            {(products.data ?? []).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
              >
                <span>{p.nameAr}</span>
                <span className="font-medium">{formatCurrency(p.estimatedPrice)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {tab === 'customers' && (
        <SectionCard title="تقرير العملاء">
          <ul className="space-y-2">
            {(customers.data ?? []).map((c) => {
              const count = (orders.data ?? []).filter((o) => o.customerId === c.id).length;
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{count} طلبات</span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
