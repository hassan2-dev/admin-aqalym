'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { DataTable, Td } from '@/presentation/components/shared/data-table';
import { StatusBadge } from '@/presentation/components/shared/status-badge';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useFactoryMutations, useInventory, useOrderMutations, useOrders, useProductionOrders } from '@/presentation/hooks/use-data';
import { ar } from '@/presentation/i18n/ar';

export default function FactoryPage() {
  const production = useProductionOrders();
  const orders = useOrders();
  const inventory = useInventory();
  const mutations = useFactoryMutations();
  const orderMutations = useOrderMutations();
  const [q, setQ] = useState('');

  const orderMap = useMemo(() => new Map((orders.data ?? []).map((o) => [o.id, o])), [orders.data]);

  const queue = useMemo(() => {
    const fromPo = (production.data ?? []).map((po) => {
      const order = orderMap.get(po.orderId);
      return {
        id: po.id,
        orderId: po.orderId,
        orderNumber: po.orderNumber,
        status: po.status,
        productName: order?.productName ?? '—',
        quantity: order?.measurements.quantity ?? 1,
        size:
          order?.measurements.width && order?.measurements.height
            ? `${order.measurements.width}×${order.measurements.height} سم`
            : '—',
        materials: po.materials ?? [],
        updatedAt: po.updatedAt,
      };
    });

    const poOrderIds = new Set(fromPo.map((p) => p.orderId));
    const fromOrders = (orders.data ?? [])
      .filter(
        (o) =>
          ['sent_to_factory', 'in_production', 'ready'].includes(o.status) && !poOrderIds.has(o.id),
      )
      .map((o) => ({
        id: o.id,
        orderId: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        productName: o.productName,
        quantity: o.measurements.quantity,
        size:
          o.measurements.width && o.measurements.height
            ? `${o.measurements.width}×${o.measurements.height} سم`
            : '—',
        materials: [] as typeof fromPo[number]['materials'],
        updatedAt: o.updatedAt,
      }));

    const merged = [...fromPo, ...fromOrders].sort((a, b) =>
      (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
    );

    const query = q.trim();
    return merged.filter(
      (row) =>
        !query ||
        row.orderNumber.includes(query) ||
        String(row.productName).includes(query),
    );
  }, [production.data, orders.data, orderMap, q]);

  const lowStock = (inventory.data ?? []).filter((i) => i.quantity <= i.reorderLevel);
  const waiting = queue.filter((row) => row.status === 'sent_to_factory').length;
  const active = queue.filter((row) => row.status === 'in_production').length;
  const ready = queue.filter((row) => row.status === 'ready').length;

  async function markReady(orderId: string, poId?: string) {
    try {
      if (poId && poId !== orderId) {
        await mutations.updateProductionStatus.mutateAsync({ id: poId, status: 'ready' });
      } else {
        const po = production.data?.find((p) => p.orderId === orderId);
        if (po) {
          await mutations.updateProductionStatus.mutateAsync({ id: po.id, status: 'ready' });
        } else {
          await orderMutations.updateStatus.mutateAsync({
            id: orderId,
            status: 'ready',
            note: 'جاهز من المصنع',
          });
        }
      }
      toast.success('حالة الطلب صارت جاهز');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ما كدرنا نغيّر الحالة');
    }
  }

  if (orders.isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  if (orders.isError) {
    return <ErrorState onRetry={() => { void production.refetch(); void orders.refetch(); }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="التصنيع"
        description="افتح الطلب، شوف التفاصيل، حدّد المواد، واطبع ورقة للعمال"
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-9"
              placeholder="بحث عن أمر..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">بانتظار التنفيذ</p>
          <p className="mt-1 text-2xl font-bold">{waiting}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">قيد التصنيع</p>
          <p className="mt-1 text-2xl font-bold">{active}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">جاهز</p>
          <p className="mt-1 text-2xl font-bold">{ready}</p>
        </div>
      </div>

      {lowStock[0] ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            تنبيه مخزن: {lowStock[0].nameAr} متبقي {lowStock[0].quantity} {lowStock[0].unit}
            {lowStock.length > 1 ? ` (+${lowStock.length - 1})` : ''}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/inventory">فتح المخزن</Link>
          </Button>
        </div>
      ) : null}

      <SectionCard title={ar.liveQueue} description={`${queue.length} أمر`}>
        <DataTable
          headers={['رقم الأمر', 'شنو يُصنَّع', 'القياس', 'الكمية', 'المرحلة', '']}
          empty={!queue.length}
          emptyTitle="لا توجد أوامر في المصنع"
          emptyDescription="المبيعات ترسل الطلب بعد التسعير والاعتماد."
        >
          {queue.map((row) => (
            <tr key={row.id} className="hover:bg-muted/30">
              <Td className="font-semibold">{row.orderNumber}</Td>
              <Td>
                <p>{row.productName}</p>
                {row.materials.length ? (
                  <p className="text-[11px] text-muted-foreground">
                    مواد: {row.materials.map((m) => `${m.nameAr} ${m.quantity}${m.unit}`).join(' · ')}
                  </p>
                ) : null}
              </Td>
              <Td>{row.size}</Td>
              <Td>{row.quantity}</Td>
              <Td>
                <StatusBadge status={row.status} />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm">
                    <Link href={`/factory/${row.orderId}`}>فتح الطلب</Link>
                  </Button>
                  {['sent_to_factory', 'in_production'].includes(row.status) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void markReady(row.orderId, row.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> جاهز
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>
    </div>
  );
}
