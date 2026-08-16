'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, Factory, Printer, Search } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { StatusBadge } from '@/presentation/components/shared/status-badge';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import {
  useAccessories,
  useFactoryMutations,
  useGlass,
  useInventory,
  useOrder,
  useOrderMutations,
  useProductionOrders,
} from '@/presentation/hooks/use-data';
import {
  FactoryPrintSheet,
  printFactoryWorkOrder,
} from '@/presentation/components/factory/factory-print-sheet';

export default function FactoryOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orderQuery = useOrder(id);
  const production = useProductionOrders();
  const inventory = useInventory();
  const glass = useGlass();
  const accessories = useAccessories();
  const mutations = useFactoryMutations();
  const orderMutations = useOrderMutations();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [stockQ, setStockQ] = useState('');

  const order = orderQuery.data;
  const po = useMemo(
    () => (production.data ?? []).find((p) => p.orderId === id || p.id === id),
    [production.data, id],
  );
  const items = inventory.data ?? [];
  const savedMaterials = po?.materials ?? [];
  const canWork = order ? ['sent_to_factory', 'in_production'].includes(order.status) : false;
  const canMarkReady = order
    ? ['sent_to_factory', 'in_production'].includes(order.status)
    : false;

  const filteredStock = useMemo(() => {
    const q = stockQ.trim();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.nameAr?.includes(q) ||
        i.sku?.toLowerCase().includes(q.toLowerCase()) ||
        i.name?.toLowerCase().includes(q.toLowerCase()),
    );
  }, [items, stockQ]);

  const planned = items
    .map((item) => ({ item, used: Number(qty[item.id] || 0) }))
    .filter((row) => row.used > 0);
  const stockErrors = planned.filter((row) => row.used > row.item.quantity);

  const glassName = glass.data?.find((g) => g.id === order?.selectedGlass)?.nameAr || order?.selectedGlass;
  const accessoryNames = (order?.selectedAccessories ?? [])
    .map((aid) => accessories.data?.find((a) => a.id === aid)?.nameAr || aid)
    .filter(Boolean)
    .join('، ');

  const printMaterials = [
    ...savedMaterials.map((m) => ({ nameAr: m.nameAr, quantity: m.quantity, unit: m.unit })),
    ...planned
      .filter((row) => !savedMaterials.some((m) => m.inventoryId === row.item.id))
      .map((row) => ({ nameAr: row.item.nameAr, quantity: row.used, unit: row.item.unit })),
  ];

  async function saveMaterials() {
    if (!order) return;
    if (!planned.length) {
      toast.error('اختر مواد من المخزن واكتب الكمية');
      return;
    }
    if (stockErrors.length) {
      toast.error('في مواد كميتها أكبر من المتوفر بالمخزن');
      return;
    }
    try {
      const result = await mutations.issueExecution.mutateAsync({
        orderId: order.id,
        notes: notes || undefined,
        materials: planned.map((row) => ({
          inventoryId: row.item.id,
          quantity: row.used,
        })),
      });
      setQty({});
      toast.success('تم خصم المواد من المخزن');
      result.warnings.forEach((w) => toast.warning(w));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل حفظ المواد');
    }
  }

  async function markReady() {
    if (!order) return;
    try {
      if (po) {
        await mutations.updateProductionStatus.mutateAsync({ id: po.id, status: 'ready' });
      } else {
        await orderMutations.updateStatus.mutateAsync({
          id: order.id,
          status: 'ready',
          note: 'جاهز من المصنع',
        });
      }
      toast.success('حالة الطلب صارت جاهز');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ما كدرنا نغيّر الحالة');
    }
  }

  if (orderQuery.isLoading) return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  if (orderQuery.isError || !order) return <ErrorState onRetry={() => void orderQuery.refetch()} />;

  const printData = {
    orderNumber: order.orderNumber,
    productName: order.productName,
    categoryName: order.categoryName,
    customerName: order.customerName,
    width: order.measurements?.width,
    height: order.measurements?.height,
    quantity: order.measurements?.quantity,
    variant: order.selectedVariant,
    glass: glassName,
    color: order.selectedColor,
    accessories: accessoryNames,
    notes: notes || po?.notes || order.notes,
    materials: printMaterials,
  };

  return (
    <>
      <div className="no-print space-y-6">
        <Link href="/factory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> أوامر التصنيع
        </Link>

        <PageHeader
          title={`طلب ${order.orderNumber}`}
          description="اختار مواد المخزن بالكميات، غيّر الحالة إلى جاهز، واطبع الورقة للإدارة والعمال"
          actions={<StatusBadge status={order.status} />}
        />

        <div className="flex flex-wrap gap-2">
          {canMarkReady ? (
            <Button variant="accent" onClick={() => void markReady()} disabled={mutations.updateProductionStatus.isPending || orderMutations.updateStatus.isPending}>
              <CheckCircle2 className="h-4 w-4" /> تغيير الحالة إلى جاهز
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => printFactoryWorkOrder()}>
            <Printer className="h-4 w-4" /> طباعة الطلب والمواد
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          <SectionCard title="تفاصيل الطلب" className="xl:col-span-2">
            <dl className="space-y-3 text-sm">
              <Spec label="المنتج / الخدمة" value={order.productName} />
              <Spec label="التصنيف" value={order.categoryName || '—'} />
              <Spec label="القياس" value={`${order.measurements?.width ?? 0} × ${order.measurements?.height ?? 0} سم`} />
              <Spec label="الكمية" value={`${order.measurements?.quantity ?? 1} قطعة`} />
              <Spec label="الخيار" value={order.selectedVariant || '—'} />
              <Spec label="الزجاج" value={glassName || '—'} />
              <Spec label="اللون" value={order.selectedColor || '—'} />
              <Spec label="الإكسسوارات" value={accessoryNames || '—'} />
              {order.notes ? <Spec label="ملاحظة" value={order.notes} /> : null}
            </dl>
          </SectionCard>

          <SectionCard
            title="المخزن — اختار المواد والكمية"
            description="المخزن كامل. اكتب كمية كل مادة تريدها لهذا التصنيع."
            className="xl:col-span-3"
          >
            {savedMaterials.length ? (
              <div className="mb-4 rounded-xl bg-muted/40 p-3 text-sm">
                <p className="mb-2 font-medium">مواد انخصمت لهذا الطلب:</p>
                {savedMaterials.map((m) => (
                  <p key={`${m.inventoryId}-${m.quantity}`} className="text-muted-foreground">
                    {m.quantity} {m.unit} · {m.nameAr}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pe-9"
                placeholder="بحث بالمخزن..."
                value={stockQ}
                onChange={(e) => setStockQ(e.target.value)}
              />
            </div>

            {!items.length ? (
              <p className="text-sm text-muted-foreground">المخزن فاضي. أضف أصناف من تاب المخزن.</p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto">
                {filteredStock.map((item) => {
                  const used = Number(qty[item.id] || 0);
                  const over = used > item.quantity;
                  const selected = used > 0;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 ${selected ? 'border-accent bg-accent/5' : 'border-border'}`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{item.nameAr}</p>
                          <p className="text-[11px] text-muted-foreground">
                            المتوفر {item.quantity} {item.unit}
                            {item.sku ? ` · ${item.sku}` : ''}
                          </p>
                        </div>
                        {over ? (
                          <span className="text-[11px] font-semibold text-destructive">أكثر من المتوفر</span>
                        ) : selected ? (
                          <span className="text-[11px] text-accent">مختارة</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="shrink-0 text-xs text-muted-foreground">الكمية</Label>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          step="any"
                          placeholder="0"
                          value={qty[item.id] ?? ''}
                          onChange={(e) => setQty((s) => ({ ...s, [item.id]: e.target.value }))}
                          dir="ltr"
                          className="text-left"
                          disabled={!canWork}
                        />
                        <span className="shrink-0 text-xs text-muted-foreground">{item.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <Label>ملاحظة للعمال / الإدارة</Label>
                <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canWork} />
              </div>
              {planned.length ? (
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm">
                  <p className="mb-1 font-medium">راح ينخصم هسه:</p>
                  {planned.map((row) => (
                    <p key={row.item.id} className="text-muted-foreground">
                      {row.used} {row.item.unit} · {row.item.nameAr}
                    </p>
                  ))}
                </div>
              ) : null}
              {canWork ? (
                <Button
                  className="w-full"
                  disabled={mutations.issueExecution.isPending || !!stockErrors.length || !planned.length}
                  onClick={() => void saveMaterials()}
                >
                  <Factory className="h-4 w-4" />
                  {mutations.issueExecution.isPending ? 'جاري الخصم...' : 'خصم المواد المختارة من المخزن'}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">بعد ما يصير جاهز ما ينخصم مواد إضافية.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <FactoryPrintSheet data={printData} />
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
