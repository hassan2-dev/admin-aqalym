'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Boxes,
  Package,
  Puzzle,
  Layers,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { DataTable, Td } from '@/presentation/components/shared/data-table';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import {
  useFactoryMutations,
  useInventory,
  useInventoryTransactions,
} from '@/presentation/hooks/use-data';
import { ar } from '@/presentation/i18n/ar';
import { formatDateTime } from '@/shared/lib/utils';
import { BRAND } from '@/shared/constants/brand';
import type { InventoryItem } from '@/domain/entities';

export default function InventoryPage() {
  const inventory = useInventory();
  const txns = useInventoryTransactions();
  const mutations = useFactoryMutations();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');

  const items = inventory.data ?? [];
  const low = items.filter((i) => i.quantity <= i.reorderLevel);
  const available = items.filter((i) => i.quantity > i.reorderLevel).length;
  const efficiency = items.length
    ? Math.round((available / items.length) * 100)
    : 78;

  const summary = useMemo(() => {
    const alu = items.find((i) => i.sku.startsWith('ALU'));
    const glass = items.find((i) => i.sku.startsWith('GLS'));
    const acc = items.find((i) => i.sku.startsWith('ACC') || i.sku.startsWith('RUB'));
    return { alu, glass, acc, categories: items.length };
  }, [items]);

  const analysis = [
    { name: 'متوفر', value: available, color: BRAND.chart.primary },
    { name: 'تحت الطلب', value: Math.max(0, items.length - available - low.length), color: BRAND.chart.accent },
    { name: 'نفد', value: items.filter((i) => i.quantity === 0).length, color: BRAND.chart.danger },
  ];

  if (inventory.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (inventory.isError) return <ErrorState onRetry={() => void inventory.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.inventoryManagement}
        description="متابعة المخزون والحركات ونظام الخصم التلقائي"
        actions={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => toast.message('سجّل بلاغ التلف من سجل الحركات')}
          >
            بلاغ تلف
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="بروفيلات ألمنيوم"
          value={`${summary.alu?.quantity ?? 0} ${summary.alu?.unit ?? 'متر'}`}
          icon={Layers}
          trend="-12% هذا الأسبوع"
          trendTone="danger"
        />
        <StatCard
          title="وحدات الزجاج"
          value={`${summary.glass?.quantity ?? 0} ${summary.glass?.unit ?? 'م²'}`}
          icon={Package}
          trend="+5%"
          trendTone="success"
        />
        <StatCard
          title="الإكسسوارات"
          value={`${summary.acc?.quantity ?? 0} قطعة`}
          icon={Puzzle}
          badge={low.length ? ar.lowStock : undefined}
          badgeTone="danger"
        />
        <StatCard title="مواد إضافية" value={`${summary.categories} فئة`} icon={Boxes} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="تحليل المخزون">
          <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { value: efficiency },
                    { value: 100 - efficiency },
                  ]}
                  dataKey="value"
                  innerRadius={52}
                  outerRadius={70}
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
              <span className="text-xs text-muted-foreground">{ar.efficiency}</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {analysis.map((a) => (
              <div key={a.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                  {a.name}
                </span>
                <strong>{a.value}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="تنبيهات النقص" className="xl:col-span-2">
          {low.length ? (
            <div className="space-y-2">
              {low.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="font-medium">{item.nameAr}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit} — الحد الأدنى {item.reorderLevel}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(item);
                      setQty(String(item.quantity));
                      setAdjustOpen(true);
                    }}
                  >
                    تعديل الكمية
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد تنبيهات حالياً</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="سجل حركة المخزون">
        <DataTable
          headers={['التاريخ', 'المادة', 'النوع', 'الكمية', 'المرجع', 'ملاحظة']}
          loading={txns.isLoading}
          error={txns.isError}
          onRetry={() => void txns.refetch()}
          empty={!txns.data?.length}
          emptyTitle="لا توجد حركات بعد"
          emptyDescription="ستظهر حركات الخصم عند تحويل الطلبات للإنتاج."
        >
          {(txns.data ?? []).map((t) => {
            const item = items.find((i) => i.id === t.inventoryId);
            return (
              <tr key={t.id} className="hover:bg-muted/30">
                <Td>{formatDateTime(t.createdAt)}</Td>
                <Td>
                  <p className="font-medium">{item?.nameAr ?? t.inventoryId}</p>
                  <p className="text-[11px] text-muted-foreground">{item?.sku}</p>
                </Td>
                <Td>
                  <span
                    className={
                      t.type === 'out'
                        ? 'rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive'
                        : 'rounded-full bg-success/10 px-2 py-0.5 text-xs text-success'
                    }
                  >
                    {t.type === 'out' ? 'استهلاك إنتاج' : t.type === 'in' ? 'توريد' : 'تعديل'}
                  </span>
                </Td>
                <Td className={t.type === 'out' ? 'font-semibold text-destructive' : 'font-semibold text-success'}>
                  {t.type === 'out' ? '-' : '+'}
                  {t.quantity}
                </Td>
                <Td>{t.reference || '—'}</Td>
                <Td className="text-muted-foreground">{t.note || '—'}</Td>
              </tr>
            );
          })}
        </DataTable>
      </SectionCard>

      <SectionCard title="أصناف المخزون">
        <DataTable headers={['SKU', 'الاسم', 'الكمية', 'الوحدة', 'حد إعادة الطلب', 'إجراء']}>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30">
              <Td className="font-mono text-xs">{item.sku}</Td>
              <Td className="font-medium">{item.nameAr}</Td>
              <Td className={item.quantity <= item.reorderLevel ? 'font-bold text-destructive' : ''}>
                {item.quantity}
              </Td>
              <Td>{item.unit}</Td>
              <Td>{item.reorderLevel}</Td>
              <Td>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(item);
                    setQty(String(item.quantity));
                    setNote('');
                    setAdjustOpen(true);
                  }}
                >
                  تعديل
                </Button>
              </Td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground">
        <p>{ar.autoDeduction}: يتم خصم المواد تلقائياً عند تحويل الطلبات للإنتاج</p>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs">مفعّل</span>
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل كمية — {editing?.nameAr}</DialogTitle>
          </DialogHeader>
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input placeholder="ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button
            variant="accent"
            onClick={() => {
              if (!editing) return;
              void mutations.adjustInventory
                .mutateAsync({ id: editing.id, quantity: Number(qty), note })
                .then(() => {
                  toast.success('تم تحديث الكمية');
                  setAdjustOpen(false);
                })
                .catch((e) => toast.error(e instanceof Error ? e.message : 'فشل التحديث'));
            }}
          >
            حفظ
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
