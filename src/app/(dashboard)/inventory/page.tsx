'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Boxes, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { DataTable, Td } from '@/presentation/components/shared/data-table';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import {
  useFactoryMutations,
  useInventory,
  useInventoryTransactions,
} from '@/presentation/hooks/use-data';
import { ar } from '@/presentation/i18n/ar';
import { formatDateTime } from '@/shared/lib/utils';
import { INVENTORY_UNITS } from '@/shared/constants/spec-suggestions';
import type { InventoryItem } from '@/domain/entities';

type AdjustMode = 'set' | 'add' | 'damage';

const TXN_PAGE_SIZE = 10;

export default function InventoryPage() {
  const inventory = useInventory();
  const txns = useInventoryTransactions();
  const mutations = useFactoryMutations();
  const [q, setQ] = useState('');
  const [txnPage, setTxnPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<AdjustMode>('set');
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('قطعة');
  const [startQty, setStartQty] = useState('');
  const [alertLevel, setAlertLevel] = useState('');

  const items = inventory.data ?? [];

  const filteredItems = useMemo(() => {
    const query = q.trim();
    if (!query) return items;
    return items.filter(
      (i) =>
        i.nameAr?.includes(query) ||
        i.sku?.toLowerCase().includes(query.toLowerCase()) ||
        i.name?.toLowerCase().includes(query.toLowerCase()),
    );
  }, [items, q]);

  const low = items.filter((i) => i.quantity <= i.reorderLevel);

  function openAdjust(item: InventoryItem, nextMode: AdjustMode) {
    setEditing(item);
    setMode(nextMode);
    setQty(nextMode === 'set' ? String(item.quantity) : '');
    setNote(nextMode === 'damage' ? 'بلاغ تلف' : '');
    setAdjustOpen(true);
  }

  function openCreate() {
    setNameAr('');
    setSku('');
    setUnit('قطعة');
    setStartQty('');
    setAlertLevel('');
    setFormOpen(true);
  }

  async function saveItem() {
    if (!nameAr.trim()) {
      toast.error('اكتب اسم الصنف');
      return;
    }
    const quantity = Number(startQty);
    const reorderLevel = Number(alertLevel);
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('أدخل الكمية الابتدائية');
      return;
    }
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      toast.error('أدخل حد التنبيه');
      return;
    }
    try {
      await mutations.saveInventory.mutateAsync({
        nameAr: nameAr.trim(),
        sku: sku.trim() || undefined,
        unit,
        quantity,
        reorderLevel,
      });
      toast.success('تمت إضافة الصنف مع حد التنبيه');
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  }

  async function removeItem(item: InventoryItem) {
    if (!window.confirm(`حذف ${item.nameAr} من المخزن؟`)) return;
    try {
      await mutations.deleteInventory.mutateAsync(item.id);
      toast.success('تم حذف الصنف');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحذف');
    }
  }

  async function saveAdjust() {
    if (!editing) return;
    const amount = Number(qty);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('أدخل كمية صحيحة');
      return;
    }

    let nextQty = amount;
    let actionNote = note.trim();
    if (mode === 'add') {
      nextQty = editing.quantity + amount;
      actionNote = actionNote || `توريد +${amount}`;
    } else if (mode === 'damage') {
      if (amount <= 0) {
        toast.error('أدخل كمية التلف');
        return;
      }
      nextQty = Math.max(0, editing.quantity - amount);
      actionNote = actionNote || `بلاغ تلف -${amount}`;
    } else {
      actionNote = actionNote || 'تعديل يدوي للكمية';
    }

    try {
      await mutations.adjustInventory.mutateAsync({
        id: editing.id,
        quantity: nextQty,
        note: actionNote,
      });
      toast.success('تم تحديث المخزون');
      setAdjustOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التحديث');
    }
  }

  if (inventory.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (inventory.isError) return <ErrorState onRetry={() => void inventory.refetch()} />;

  const dialogTitle =
    mode === 'add'
      ? `توريد — ${editing?.nameAr}`
      : mode === 'damage'
        ? `بلاغ تلف — ${editing?.nameAr}`
        : `تعديل كمية — ${editing?.nameAr}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="المخزن"
        description="إضافة وحذف الأصناف من مكان واحد، مع حد تنبيه لكل صنف"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pe-9"
                placeholder="بحث..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button variant="accent" onClick={openCreate}>
              <Plus className="h-4 w-4" /> إضافة صنف
            </Button>
          </div>
        }
      />

      {low.length ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" /> {low.length} صنف وصل حد التنبيه
          </p>
          <div className="flex flex-wrap gap-2">
            {low.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openAdjust(item, 'add')}
                className="rounded-full border border-destructive/20 bg-card px-3 py-1 text-xs"
              >
                {item.nameAr}: {item.quantity} {item.unit}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <SectionCard title="الأصناف" description={`${filteredItems.length} صنف`}>
        <DataTable
          headers={['الاسم', 'الكمية', 'الوحدة', 'حد التنبيه', 'الحالة', 'إجراء']}
          empty={!filteredItems.length}
          emptyTitle={q ? 'لا نتائج' : 'المخزن فاضي'}
          emptyDescription="أضف صنفاً وحدد حد التنبيه حتى يظهر التنبيه قبل النفاد."
        >
          {filteredItems.map((item) => {
            const isLow = item.quantity <= item.reorderLevel;
            const isEmpty = item.quantity === 0;
            return (
              <tr key={item.id} className="hover:bg-muted/30">
                <Td>
                  <p className="font-medium">{item.nameAr}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{item.sku}</p>
                </Td>
                <Td className={isLow ? 'font-bold text-destructive' : 'font-semibold'}>
                  {item.quantity}
                </Td>
                <Td>{item.unit}</Td>
                <Td>{item.reorderLevel}</Td>
                <Td>
                  <span
                    className={
                      isEmpty
                        ? 'rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive'
                        : isLow
                          ? 'rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning'
                          : 'rounded-full bg-success/10 px-2 py-0.5 text-xs text-success'
                    }
                  >
                    {isEmpty ? 'نفد' : isLow ? 'تحت الحد' : 'متوفر'}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openAdjust(item, 'add')}>
                      توريد
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAdjust(item, 'set')}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openAdjust(item, 'damage')}>
                      تلف
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => void removeItem(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </SectionCard>

      <SectionCard title="آخر الحركات">
        <DataTable
          headers={['التاريخ', 'المادة', 'النوع', 'الكمية', 'المرجع']}
          loading={txns.isLoading}
          empty={!txns.data?.length}
          emptyTitle="لا توجد حركات بعد"
        >
          {(txns.data ?? []).slice(0, 20).map((t) => {
            const item = items.find((i) => i.id === t.inventoryId);
            const isOut = t.type === 'out';
            return (
              <tr key={t.id}>
                <Td>{formatDateTime(t.createdAt)}</Td>
                <Td>{item?.nameAr ?? t.inventoryId}</Td>
                <Td>{isOut ? (t.note?.includes('تلف') ? 'تلف' : 'خصم') : 'إضافة'}</Td>
                <Td className={isOut ? 'text-destructive' : 'text-success'}>
                  {isOut ? '-' : '+'}
                  {t.quantity}
                </Td>
                <Td>{t.reference || t.note || '—'}</Td>
              </tr>
            );
          })}
        </DataTable>
      </SectionCard>

      <div className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground">
        <Boxes className="h-4 w-4" />
        أمر التنفيذ في المصنع يخصم الكميات تلقائياً من هنا
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة صنف للمخزن</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم الصنف</Label>
              <Input className="mt-1" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="بروفيل ألمنيوم ٧٠ مم" />
            </div>
            <div>
              <Label>رمز الصنف (اختياري)</Label>
              <Input className="mt-1" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="ALU-70" dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الوحدة</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {INVENTORY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>الكمية الابتدائية</Label>
                <Input className="mt-1" type="number" min={0} value={startQty} onChange={(e) => setStartQty(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div>
              <Label>حد التنبيه</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                value={alertLevel}
                onChange={(e) => setAlertLevel(e.target.value)}
                placeholder="مثلاً 20"
                dir="ltr"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                إذا وصلت الكمية لهذا الرقم يظهر تنبيه نقص — حتى ما ينفد الصنف فجأة.
              </p>
            </div>
            <Button variant="accent" className="w-full" disabled={mutations.saveInventory.isPending} onClick={() => void saveItem()}>
              حفظ الصنف
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <p className="text-sm text-muted-foreground">
              الكمية الحالية: <strong>{editing.quantity}</strong> {editing.unit} · حد التنبيه {editing.reorderLevel}
            </p>
          ) : null}
          <Input
            type="number"
            min={0}
            placeholder={mode === 'set' ? 'الكمية الجديدة' : mode === 'add' ? 'كمية التوريد' : 'كمية التلف'}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            dir="ltr"
            className="text-left"
          />
          <Input placeholder="ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button
            variant={mode === 'damage' ? 'destructive' : 'accent'}
            disabled={mutations.adjustInventory.isPending}
            onClick={() => void saveAdjust()}
          >
            {mutations.adjustInventory.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
