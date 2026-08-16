'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Download, MoreHorizontal, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { DataTable, Td } from '@/presentation/components/shared/data-table';
import { StatusBadge } from '@/presentation/components/shared/status-badge';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { Input } from '@/presentation/components/ui/input';
import { Button } from '@/presentation/components/ui/button';
import { useOrders } from '@/presentation/hooks/use-data';
import { ORDER_STATUS_LABELS } from '@/domain/enums';
import { ar } from '@/presentation/i18n/ar';
import { downloadCsv, formatCurrency, formatDate } from '@/shared/lib/utils';
import { useAuth } from '@/presentation/providers/auth-provider';
import { isOrderPriced, salesStage, SALES_STAGE_LABELS, type SalesStageId } from '@/shared/lib/order-flow';
import {
  ShoppingCart,
  Clock,
  Factory,
  PackageCheck,
} from 'lucide-react';

const PAGE_SIZE = 10;

const STAGE_PILLS: { id: SalesStageId | 'all'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'review', label: SALES_STAGE_LABELS.review },
  { id: 'pricing', label: SALES_STAGE_LABELS.pricing },
  { id: 'approval', label: SALES_STAGE_LABELS.approval },
  { id: 'ready_factory', label: SALES_STAGE_LABELS.ready_factory },
  { id: 'factory', label: SALES_STAGE_LABELS.factory },
  { id: 'done', label: SALES_STAGE_LABELS.done },
];

export default function OrdersPage() {
  const { can } = useAuth();
  const canSeePrices = can('finance.view') || can('orders.price');
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<SalesStageId | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const { data, isLoading, isError, refetch } = useOrders({
    q: q || undefined,
  });

  const filtered = useMemo(() => {
    const all = data ?? [];
    if (stage === 'all') return all;
    return all.filter((o) => salesStage(o) === stage);
  }, [data, stage]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const summary = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      pending: all.filter((o) =>
        ['review', 'pricing', 'approval'].includes(salesStage(o)),
      ).length,
      factory: all.filter((o) => salesStage(o) === 'factory').length,
      completed: all.filter((o) => salesStage(o) === 'done').length,
    };
  }, [data]);

  function toggleAll() {
    if (selected.length === rows.length) setSelected([]);
    else setSelected(rows.map((r) => r.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الطلبات"
        description="المراحل: مراجعة → تسعير → اعتماد → المصنع. الإدارة تعرض الطلبات فقط، والمبيعات تدير المسار."
        actions={
          <>
            {can('orders.create') || can('orders.edit') ? (
              <Button asChild variant="accent" size="sm">
                <Link href="/orders/new">
                  <Plus className="h-4 w-4" /> طلب جديد
                </Link>
              </Button>
            ) : null}
            {can('orders.approve') ? (
              <Button variant="default" size="sm" disabled={!selected.length}>
                <Check className="h-4 w-4" /> اعتماد المحدد
              </Button>
            ) : null}
            {canSeePrices ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    'orders.csv',
                    (data ?? []).map((o) => ({
                      orderNumber: o.orderNumber,
                      customer: o.customerName,
                      product: o.productName,
                      status: ORDER_STATUS_LABELS[o.status],
                      amount: formatCurrency(o.finalPrice ?? o.estimatedPrice),
                      date: o.createdAt,
                    })),
                  )
                }
              >
                <Download className="h-4 w-4" /> {ar.exportCsv}
              </Button>
            ) : null}
          </>
        }
      />

      {!can('orders.edit') && can('orders.view') ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          عرض فقط. مسار الطلب (مراجعة، تسعير، اعتماد) عند المبيعات.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي الطلبات" value={summary.total} icon={ShoppingCart} />
        <StatCard title={ar.pendingOrders} value={summary.pending} icon={Clock} />
        <StatCard title={ar.factoryOrders} value={summary.factory} icon={Factory} />
        <StatCard title={ar.completedOrders} value={summary.completed} icon={PackageCheck} />
      </div>

      <SectionCard>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {STAGE_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setStage(pill.id);
                  setPage(1);
                }}
                className={
                  stage === pill.id
                    ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                    : 'rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted'
                }
              >
                {pill.label}
              </button>
            ))}
          </div>
          <div className="relative ms-auto w-full lg:max-w-xs">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-9"
              placeholder="بحث عن طلب..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <DataTable
          headers={
            canSeePrices
              ? ['', 'رقم الطلب', 'العميل', 'المنتج', 'المقاسات', 'الحالة', 'السعر', 'التاريخ', '']
              : ['', 'رقم الطلب', 'العميل', 'المنتج', 'المقاسات', 'الحالة', 'التاريخ', '']
          }
          loading={isLoading}
          error={isError}
          onRetry={() => void refetch()}
          empty={!rows.length}
          emptyTitle="لا توجد طلبات"
          emptyDescription="جرّب تغيير الفلاتر أو انتظر طلبات جديدة من التطبيق."
        >
          <tr className="border-b border-border bg-muted/20">
            <Td>
              <input type="checkbox" checked={selected.length === rows.length && rows.length > 0} onChange={toggleAll} />
            </Td>
            <Td colSpan={canSeePrices ? 8 : 7} className="text-xs text-muted-foreground">
              تحديد الكل في الصفحة
            </Td>
          </tr>
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-muted/30">
              <Td>
                <input
                  type="checkbox"
                  checked={selected.includes(o.id)}
                  onChange={() =>
                    setSelected((prev) =>
                      prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id]
                    )
                  }
                />
              </Td>
              <Td>
                <Link className="font-semibold text-primary hover:underline" href={`/orders/${o.id}`}>
                  {o.orderNumber}
                </Link>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {o.customerName.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium">{o.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {o.location.city || o.location.governorate}
                    </p>
                  </div>
                </div>
              </Td>
              <Td>{o.productName}</Td>
              <Td className="tabular-nums text-muted-foreground">
                {o.measurements.width} × {o.measurements.height}
              </Td>
              <Td>
                <StatusBadge status={o.status} />
              </Td>
              {canSeePrices ? (
                <Td className="font-medium">
                  {isOrderPriced(o) ? formatCurrency(o.finalPrice!) : (
                    <span className="text-warning">بدون سعر</span>
                  )}
                </Td>
              ) : null}
              <Td>{formatDate(o.createdAt)}</Td>
              <Td>
                <Link href={`/orders/${o.id}`} className="inline-flex rounded-lg p-1.5 hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Td>
            </tr>
          ))}
        </DataTable>

        {!isLoading && !isError && rows.length > 0 ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} من{' '}
              {filtered.length} طلب
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                السابق
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                التالي
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
