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
import { MoneyInput } from '@/presentation/components/ui/money-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useAuth } from '@/presentation/providers/auth-provider';
import { useGlass, useOrder, useOrderMutations } from '@/presentation/hooks/use-data';
import { formatCurrency, formatDateTime, parseIqdNumber } from '@/shared/lib/utils';
import { cn } from '@/shared/lib/utils';
import { canApproveOrder, canSendToFactory, isOrderPriced, ORDER_PROGRESS_STEPS, orderProgressIndex } from '@/shared/lib/order-flow';

const STEPS = ORDER_PROGRESS_STEPS;

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

  const stepIndex = useMemo(() => (order ? orderProgressIndex(order) : 0), [order]);

  if (isLoading) return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  if (isError || !order) return <ErrorState onRetry={() => void refetch()} />;

  const glassName = glass.data?.find((g) => g.id === order.selectedGlass)?.nameAr;
  const canSeePrices = can('finance.view') || can('orders.price');
  const final = order.finalPrice ?? order.estimatedPrice;

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
    } catch (e) {
      const code =
        typeof e === 'object' && e && 'code' in e ? String((e as { code: string }).code) : '';
      const msg = e instanceof Error ? e.message : 'فشل الإجراء';
      if (code.includes('permission-denied')) {
        toast.error('ما عندك صلاحية تعديل الطلب — انشر قواعد Firestore أو سجّل دخول كمدير');
      } else {
        toast.error(msg);
      }
      console.error('[order-action]', code || msg, e);
    }
  }

  const canApprove = can('orders.approve') || can('orders.edit');
  const canReject = can('orders.reject') || can('orders.edit');
  const canPrice = can('orders.price') || can('orders.edit');
  const canProduce = can('orders.production');
  const factoryOnly = canProduce && !can('orders.price');
  const canSend = (canApprove || canPrice) && !factoryOnly;
  const priced = isOrderPriced(order);
  const readyForFactory = canSendToFactory(order);
  const mutating =
    mutations.updateStatus.isPending ||
    mutations.convert.isPending ||
    mutations.updatePrice.isPending;

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
              {canPrice && ['under_review', 'approved'].includes(order.status) ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setPrice(String(order.finalPrice ?? order.estimatedPrice ?? 0));
                    setPriceOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" /> {priced ? 'تعديل السعر' : 'تسعير الطلب'}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
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

      {!priced && order.status === 'submitted' && canApprove ? (
        <div className="no-print rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          ابدأ المراجعة أولاً. بعدها التسعير، وبعدين الاعتماد. ما يصير اعتماد بدون سعر.
        </div>
      ) : null}

      {!priced && order.status === 'under_review' && canPrice ? (
        <div className="no-print rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          الطلب قيد المراجعة. سعّره أولاً — الاعتماد ما يشتغل بدون تسعير.
        </div>
      ) : null}

      {priced && order.status === 'under_review' && canApprove ? (
        <div className="no-print rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
          تم التسعير. هسه تقدر تعتمد الطلب.
        </div>
      ) : null}

      <div className="no-print flex flex-wrap gap-2">
        {canApprove && order.status === 'submitted' ? (
          <Button
            variant="accent"
            disabled={mutating}
            onClick={() =>
              void run(
                () => mutations.updateStatus.mutateAsync({ id: order.id, status: 'under_review' }),
                'تم بدء المراجعة'
              )
            }
          >
            بدء المراجعة
          </Button>
        ) : null}
        {canPrice && order.status === 'under_review' && !priced ? (
          <Button
            variant="default"
            disabled={mutating}
            onClick={() => {
              setPrice(String(order.finalPrice ?? order.estimatedPrice ?? 0));
              setPriceOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" /> تسعير الطلب
          </Button>
        ) : null}
        {canApprove && order.status === 'under_review' ? (
          <Button
            disabled={mutating || !canApproveOrder(order)}
            onClick={() =>
              void run(
                () => mutations.updateStatus.mutateAsync({ id: order.id, status: 'approved' }),
                'تم اعتماد الطلب'
              )
            }
          >
            <Check className="h-4 w-4" /> اعتماد
          </Button>
        ) : null}
        {canApprove && order.status === 'under_review' && !priced ? (
          <p className="self-center text-xs text-muted-foreground">ما يصير الاعتماد بدون تسعير</p>
        ) : null}
        {canReject && ['submitted', 'under_review'].includes(order.status) ? (
          <Button variant="destructive" disabled={mutating} onClick={() => setRejectOpen(true)}>
            <X className="h-4 w-4" /> رفض
          </Button>
        ) : null}
        {canSend && order.status === 'approved' ? (
          <Button
            variant="secondary"
            disabled={mutating || !readyForFactory}
            onClick={() =>
              void run(() => mutations.convert.mutateAsync(order.id), 'تم إرسال الطلب للمصنع')
            }
          >
            <Factory className="h-4 w-4" /> إرسال للمصنع
          </Button>
        ) : null}
        {canSend && order.status === 'approved' && !priced ? (
          <p className="self-center text-xs text-muted-foreground">لازم تسعير قبل الإرسال للمصنع</p>
        ) : null}
        {canProduce && order.status === 'sent_to_factory' ? (
          <Button asChild variant="secondary">
            <Link href="/factory">فتح أمر التنفيذ في المصنع</Link>
          </Button>
        ) : null}
        {canProduce && order.status === 'in_production' ? (
          <Button
            disabled={mutating}
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
        {canProduce && order.status === 'ready' ? (
          <Button
            disabled={mutating}
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
        {canProduce && order.status === 'installation' ? (
          <Button
            disabled={mutating}
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
                {order.location?.governorate || '—'} — {order.location?.city || '—'}
              </p>
              <p className="text-muted-foreground">{order.location?.address || '—'}</p>
              {order.location?.latitude && order.location?.longitude ? (
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

          {canSeePrices ? (
            <div className="rounded-xl bg-primary p-5 text-primary-foreground shadow-soft">
              <p className="mb-4 text-sm font-semibold opacity-90">الملخص المالي</p>
              <div className="rounded-xl bg-white/95 p-3 text-primary">
                <p className="text-xs text-muted-foreground">السعر</p>
                <p className="text-2xl font-bold">{formatCurrency(final)}</p>
              </div>
              <div className="mt-4 grid gap-2">
                <Button variant="accent" className="w-full">
                  تأكيد استلام الدفعة
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  <Share2 className="h-4 w-4" /> مشاركة الفاتورة
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 xl:col-span-2">
          <SectionCard title="التفاصيل الفنية للمنتج">
            <p className="mb-4 text-xs font-medium text-accent">{order.categoryName} — {order.productName}</p>
            {order.lineItems && order.lineItems.length > 0 ? (
              <div className="mb-4 space-y-2">
                {order.lineItems.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{line.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.width}×{line.height} سم · الكمية {line.quantity}
                        {canSeePrices ? ` · ${formatCurrency(line.unitPrice)} / وحدة` : ''}
                      </p>
                    </div>
                    {canSeePrices ? (
                      <p className="shrink-0 font-semibold">{formatCurrency(line.lineTotal)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Spec label="الخيار المحدد" value={order.selectedVariant || order.orderKind} />
              <Spec
                label="الأبعاد"
                value={`${(order.measurements?.width ?? 0) * 10}mm × ${(order.measurements?.height ?? 0) * 10}mm`}
              />
              <Spec label="نوع الزجاج" value={glassName || order.selectedGlass || '—'} />
              <Spec label="الكمية" value={String(order.measurements?.quantity ?? 1)} />
            </div>
            {order.notes ? (
              <p className="mt-4 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">{order.notes}</p>
            ) : null}
          </SectionCard>

          <SectionCard title="سجل التغييرات">
            <ol className="relative space-y-4 border-s border-border ps-4">
              {(order.timeline ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">لا يوجد سجل بعد</li>
              ) : (
                (order.timeline ?? []).map((event, i) => (
                <li key={`${event.status}-${i}`} className="relative">
                  <span className="absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                  {event.by ? <p className="text-xs text-muted-foreground">بواسطة: {event.by}</p> : null}
                  {event.note ? <p className="mt-1 text-xs">{event.note}</p> : null}
                </li>
              ))
              )}
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
            <DialogTitle>تسعير الطلب</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            التسعير بعد المراجعة، والاعتماد ما يصير بدون سعر محفوظ.
          </p>
          <MoneyInput
            value={price}
            onValueChange={setPrice}
            placeholder="مثال: 100,000"
          />
          <Button
            onClick={() =>
              void run(async () => {
                await mutations.updatePrice.mutateAsync({ id: order.id, price: parseIqdNumber(price) });
                setPriceOpen(false);
              }, priced && order.status === 'under_review' ? 'تم التسعير. هسه تقدر تعتمد الطلب' : 'تم تحديث السعر')
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
