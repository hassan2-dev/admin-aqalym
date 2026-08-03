'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowRight,
  Check,
  Factory,
  MapPin,
  Pencil,
  Printer,
  Share2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatusBadge } from '@/presentation/components/shared/status-badge';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useAuth } from '@/presentation/providers/auth-provider';
import { useGlass, useOrder, useOrderMutations } from '@/presentation/hooks/use-data';
import { formatCurrency, formatDateTime } from '@/shared/lib/utils';
import { cn } from '@/shared/lib/utils';
import type { OrderStatus } from '@/domain/enums';

const STEPS: { status: OrderStatus[]; label: string }[] = [
  { status: ['submitted', 'under_review', 'approved'], label: 'تم التأكيد' },
  { status: ['sent_to_factory', 'in_production'], label: 'قيد التصنيع' },
  { status: ['ready', 'installation'], label: 'جاري الشحن' },
  { status: ['completed'], label: 'تم الاستلام' },
];

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const glass = useGlass();
  const { can } = useAuth();
  const mutations = useOrderMutations();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [price, setPrice] = useState('');

  const stepIndex = useMemo(() => {
    if (!order) return 0;
    const idx = STEPS.findIndex((s) => s.status.includes(order.status));
    if (order.status === 'rejected' || order.status === 'cancelled') return -1;
    return idx >= 0 ? idx : 0;
  }, [order]);

  if (isLoading) return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  if (isError || !order) return <ErrorState onRetry={() => void refetch()} />;

  const glassName = glass.data?.find((g) => g.id === order.selectedGlass)?.nameAr;
  const base = order.estimatedPrice;
  const final = order.finalPrice ?? order.estimatedPrice;
  const addons = Math.max(0, final - base);
  const vat = Math.round(final * 0.15);
  const grand = final + vat;

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الإجراء');
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          href="/orders"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" /> العودة للطلبات
        </Link>
        <PageHeader
          title={`طلب رقم ${order.orderNumber}`}
          description={`تاريخ الإنشاء: ${formatDateTime(order.createdAt)} · آخر تحديث: ${formatDateTime(order.updatedAt)}`}
          actions={
            <>
              <StatusBadge status={order.status} />
              {can('orders.edit') || can('orders.price') ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setPrice(String(order.finalPrice ?? order.estimatedPrice ?? 0));
                    setPriceOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" /> تعديل الطلب
                </Button>
              ) : null}
              {can('orders.print') ? (
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> طباعة
                </Button>
              ) : null}
            </>
          }
        />
      </div>

      {stepIndex >= 0 ? (
        <SectionCard className="no-print">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STEPS.map((step, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <div key={step.label} className="relative text-center">
                  <div
                    className={cn(
                      'mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold',
                      done || current
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground'
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <p className={cn('text-xs font-medium', current ? 'text-primary' : 'text-muted-foreground')}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <div className="no-print flex flex-wrap gap-2">
        {can('orders.approve') && ['submitted', 'under_review'].includes(order.status) ? (
          <>
            <Button
              variant="accent"
              onClick={() =>
                void run(
                  () => mutations.updateStatus.mutateAsync({ id: order.id, status: 'under_review' }),
                  'تم تحويل الطلب للمراجعة'
                )
              }
            >
              بدء المراجعة
            </Button>
            <Button
              onClick={() =>
                void run(
                  () => mutations.updateStatus.mutateAsync({ id: order.id, status: 'approved' }),
                  'تم اعتماد الطلب'
                )
              }
            >
              <Check className="h-4 w-4" /> اعتماد
            </Button>
          </>
        ) : null}
        {can('orders.reject') && ['submitted', 'under_review'].includes(order.status) ? (
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>
            <X className="h-4 w-4" /> رفض
          </Button>
        ) : null}
        {can('orders.production') && order.status === 'approved' ? (
          <Button
            variant="secondary"
            onClick={() => void run(() => mutations.convert.mutateAsync(order.id), 'تم التحويل للإنتاج وخصم المخزون')}
          >
            <Factory className="h-4 w-4" /> تحويل للإنتاج
          </Button>
        ) : null}
        {can('orders.production') && order.status === 'in_production' ? (
          <Button
            onClick={() =>
              void run(
                () => mutations.updateStatus.mutateAsync({ id: order.id, status: 'ready' }),
                'تم تعليم الطلب كجاهز'
              )
            }
          >
            تعليم كجاهز
          </Button>
        ) : null}
        {can('orders.production') && order.status === 'ready' ? (
          <Button
            onClick={() =>
              void run(
                () => mutations.updateStatus.mutateAsync({ id: order.id, status: 'installation' }),
                'تم جدولة التركيب'
              )
            }
          >
            جدولة التركيب
          </Button>
        ) : null}
        {can('orders.production') && order.status === 'installation' ? (
          <Button
            onClick={() =>
              void run(
                () => mutations.updateStatus.mutateAsync({ id: order.id, status: 'completed' }),
                'تم إكمال المشروع'
              )
            }
          >
            إكمال الطلب
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <SectionCard title="العميل والموقع">
            <div className="space-y-3 text-sm">
              <p className="text-lg font-semibold">{order.customerName}</p>
              <p className="text-muted-foreground" dir="ltr">
                {order.customerPhone}
              </p>
              <p>
                {order.location.governorate} — {order.location.city}
              </p>
              <p className="text-muted-foreground">{order.location.address}</p>
              {order.location.latitude && order.location.longitude ? (
                <a
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                  href={`https://www.google.com/maps?q=${order.location.latitude},${order.location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="h-4 w-4" /> فتح في الخرائط
                </a>
              ) : null}
            </div>
          </SectionCard>

          <div className="rounded-xl bg-primary p-5 text-primary-foreground shadow-soft">
            <p className="mb-4 text-sm font-semibold opacity-90">الملخص المالي</p>
            <div className="space-y-2 text-sm">
              <Row label="السعر الأساسي" value={formatCurrency(base)} />
              <Row label="إضافات" value={formatCurrency(addons)} />
              <Row label="الضريبة 15%" value={formatCurrency(vat)} />
              <div className="mt-3 rounded-xl bg-white/95 p-3 text-primary">
                <p className="text-xs text-muted-foreground">الإجمالي</p>
                <p className="text-2xl font-bold">{formatCurrency(grand)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Button variant="accent" className="w-full">
                تأكيد استلام الدفعة
              </Button>
              <Button variant="outline" className="w-full border-white/30 bg-transparent text-white hover:bg-white/10">
                <Share2 className="h-4 w-4" /> مشاركة الفاتورة
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <SectionCard title="التفاصيل الفنية للمنتج">
            <p className="mb-4 text-xs font-medium text-accent">{order.categoryName} — {order.productName}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Spec label="الخيار المحدد" value={order.selectedVariant || order.orderKind} />
              <Spec
                label="الأبعاد"
                value={`${order.measurements.width * 10}mm × ${order.measurements.height * 10}mm`}
              />
              <Spec label="نوع الزجاج" value={glassName || order.selectedGlass || '—'} />
              <Spec label="الكمية" value={String(order.measurements.quantity)} />
            </div>
            {order.notes ? (
              <p className="mt-4 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">{order.notes}</p>
            ) : null}
          </SectionCard>

          <SectionCard title="سجل التغييرات">
            <ol className="relative space-y-4 border-s border-border ps-4">
              {order.timeline.map((event, i) => (
                <li key={`${event.status}-${i}`} className="relative">
                  <span className="absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                  {event.by ? <p className="text-xs text-muted-foreground">بواسطة: {event.by}</p> : null}
                  {event.note ? <p className="mt-1 text-xs">{event.note}</p> : null}
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
          </DialogHeader>
          <Input placeholder="سبب الرفض" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            variant="destructive"
            onClick={() =>
              void run(async () => {
                await mutations.updateStatus.mutateAsync({
                  id: order.id,
                  status: 'rejected',
                  note: reason || 'مرفوض',
                });
                setRejectOpen(false);
              }, 'تم رفض الطلب')
            }
          >
            تأكيد الرفض
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل السعر</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            dir="ltr"
            className="text-left"
          />
          <Button
            onClick={() =>
              void run(async () => {
                await mutations.updatePrice.mutateAsync({ id: order.id, price: Number(price) });
                setPriceOpen(false);
              }, 'تم تحديث السعر')
            }
          >
            حفظ السعر
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between opacity-90">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
