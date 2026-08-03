'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, Factory, Play, Search } from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { DataTable, Td } from '@/presentation/components/shared/data-table';
import { StatusBadge } from '@/presentation/components/shared/status-badge';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import {
  useFactoryMutations,
  useInventory,
  useOrderMutations,
  useOrders,
  useProductionOrders,
} from '@/presentation/hooks/use-data';
import { ar } from '@/presentation/i18n/ar';
import { BRAND } from '@/shared/constants/brand';
import { ORDER_STATUS_LABELS } from '@/domain/enums';
import { cn } from '@/shared/lib/utils';

export default function FactoryPage() {
  const production = useProductionOrders();
  const orders = useOrders();
  const inventory = useInventory();
  const mutations = useFactoryMutations();
  const orderMutations = useOrderMutations();
  const [q, setQ] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [qty, setQty] = useState<Record<string, string>>({});

  const queue = useMemo(() => {
    const fromPo = production.data ?? [];
    const fromOrders = (orders.data ?? [])
      .filter((o) => ['sent_to_factory', 'in_production', 'ready'].includes(o.status))
      .map((o) => ({
        id: o.id,
        orderId: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        productName: o.productName,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }));
    const merged = fromPo.length
      ? fromPo.map((po) => ({
          ...po,
          productName: orders.data?.find((o) => o.id === po.orderId)?.productName ?? '—',
        }))
      : fromOrders;
    return merged.filter(
      (row) =>
        !q ||
        row.orderNumber.includes(q) ||
        ('productName' in row && String(row.productName).includes(q))
    );
  }, [production.data, orders.data, q]);

  const lowStock = (inventory.data ?? []).filter((i) => i.quantity <= i.reorderLevel);
  const efficiency = 84;

  const timeline = [
    { time: '08:00', label: 'بانتظار التجهيز', count: queue.filter((q) => q.status === 'sent_to_factory').length },
    { time: '11:30', label: 'قيد الإنتاج', count: queue.filter((q) => q.status === 'in_production').length },
    { time: '13:45', label: 'جاهز للفحص النهائي', count: queue.filter((q) => q.status === 'ready').length },
  ];

  if (production.isLoading || orders.isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  if (production.isError || orders.isError) {
    return <ErrorState onRetry={() => { void production.refetch(); void orders.refetch(); }} />;
  }

  async function updateStatus(id: string, status: 'in_production' | 'ready' | 'installation') {
    try {
      const po = production.data?.find((p) => p.id === id || p.orderId === id);
      if (po) {
        await mutations.updateProductionStatus.mutateAsync({ id: po.id, status });
      } else {
        await orderMutations.updateStatus.mutateAsync({
          id,
          status,
          note: 'تحديث من أرضية المصنع',
        });
      }
      toast.success('تم تحديث حالة الإنتاج');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التحديث');
    }
  }

  async function confirmConsumption() {
    const orderNumber = selectedOrder || queue[0]?.orderNumber;
    if (!orderNumber) {
      toast.error('اختر أمر إنتاج');
      return;
    }
    const deductions = (inventory.data ?? [])
      .map((item) => ({
        inventoryId: item.id,
        quantity: Number(qty[item.id] || 0),
      }))
      .filter((d) => d.quantity > 0);
    if (!deductions.length) {
      toast.error('أدخل كميات الاستهلاك');
      return;
    }
    try {
      await mutations.confirmConsumption.mutateAsync({ orderNumber, deductions });
      toast.success('تم تأكيد استهلاك المواد');
      setQty({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التأكيد');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="أرضية الإنتاج اليومية"
        description="إدارة أوامر العمل واستهلاك المواد وسير الإنتاج"
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-9"
              placeholder="بحث عن أمر إنتاج..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      />

      {lowStock[0] ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            تنبيه: {lowStock[0].nameAr} متبقي منه {lowStock[0].quantity} {lowStock[0].unit} فقط
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/inventory">طلب توريد</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title={ar.liveQueue}
          description={`${queue.length} نشط`}
          className="xl:col-span-2"
          action={
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {queue.length} نشط
            </span>
          }
        >
          <DataTable
            headers={['رقم الأمر', 'المنتج', 'المرحلة', 'الحالة', 'إجراء']}
            empty={!queue.length}
            emptyTitle="لا توجد أوامر في طابور الإنتاج"
          >
            {queue.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30">
                <Td className="font-semibold">
                  <Link href={`/orders/${row.orderId}`} className="text-primary hover:underline">
                    {row.orderNumber}
                  </Link>
                </Td>
                <Td>{'productName' in row ? String(row.productName) : '—'}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        row.status === 'in_production'
                          ? 'bg-warning'
                          : row.status === 'ready'
                            ? 'bg-success'
                            : 'bg-muted-foreground'
                      )}
                    />
                    {ORDER_STATUS_LABELS[row.status]}
                  </span>
                </Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td>
                  {row.status === 'sent_to_factory' ? (
                    <Button size="sm" onClick={() => void updateStatus(row.id, 'in_production')}>
                      <Play className="h-3.5 w-3.5" /> بدء الإنتاج
                    </Button>
                  ) : row.status === 'in_production' ? (
                    <Button size="sm" variant="outline" onClick={() => void updateStatus(row.id, 'ready')}>
                      تحديث الحالة
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => void updateStatus(row.id, 'installation')}>
                      نقل للمستودع
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </DataTable>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="إنتاجية اليوم">
            <div className="relative mx-auto h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: efficiency },
                      { value: 100 - efficiency },
                    ]}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={64}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                  >
                    <Cell fill={BRAND.chart.primary} />
                    <Cell fill="#E8EBF2" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{efficiency}%</span>
                <Factory className="mt-1 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title={ar.dailyWorkflow}>
            <ol className="space-y-4 border-s border-border ps-4">
              {timeline.map((t) => (
                <li key={t.time} className="relative">
                  <span className="absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                  <p className="text-xs text-muted-foreground">{t.time}</p>
                  <p className="text-sm font-medium">
                    {t.label} <span className="text-muted-foreground">({t.count})</span>
                  </p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>

      <SectionCard title={ar.materialConsumption} description="تسجيل المواد المستخدمة لأمر عمل محدد">
        <div className="mb-4">
          <label className="mb-1 block text-xs text-muted-foreground">أمر الإنتاج</label>
          <select
            className="flex h-10 w-full max-w-sm rounded-xl border border-input bg-card px-3 text-sm"
            value={selectedOrder}
            onChange={(e) => setSelectedOrder(e.target.value)}
          >
            <option value="">اختر...</option>
            {queue.map((row) => (
              <option key={row.id} value={row.orderNumber}>
                {row.orderNumber}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(inventory.data ?? []).slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium">{item.nameAr}</p>
              <p className="mb-2 text-xs text-muted-foreground">
                المتوفر: {item.quantity} {item.unit}
              </p>
              <Input
                type="number"
                min={0}
                placeholder="الكمية المستخدمة"
                value={qty[item.id] ?? ''}
                onChange={(e) => setQty((s) => ({ ...s, [item.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button className="mt-4" variant="accent" onClick={() => void confirmConsumption()}>
          تأكيد استهلاك المواد
        </Button>
      </SectionCard>
    </div>
  );
}
