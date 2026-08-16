'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';
import {
  useCustomers,
  useOrderMutations,
  useProducts,
} from '@/presentation/hooks/use-data';
import { formatCurrency, generateId, parseIqdNumber } from '@/shared/lib/utils';
import { normalizeNumericInput } from '@/shared/lib/digits';
import { MoneyInput } from '@/presentation/components/ui/money-input';
import { useAuth } from '@/presentation/providers/auth-provider';
import type { Product } from '@/domain/entities';

type DraftLine = {
  key: string;
  productId: string;
  width: string;
  height: string;
  quantity: string;
  unitPrice: string;
};

function emptyLine(product?: Product): DraftLine {
  return {
    key: generateId('line'),
    productId: product?.id ?? '',
    width: product ? String(product.minimumWidth || 100) : '',
    height: product ? String(product.minimumHeight || 200) : '',
    quantity: '1',
    unitPrice: product ? String(product.estimatedPrice || 0) : '',
  };
}

export default function NewOrderPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const mutations = useOrderMutations();

  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const pricedLines = useMemo(() => {
    return lines.map((line) => {
      const product = productMap.get(line.productId);
      const quantity = Math.max(1, Number(line.quantity) || 1);
      const unitPrice = Math.max(0, parseIqdNumber(line.unitPrice));
      return {
        ...line,
        product,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
    });
  }, [lines, productMap]);

  const grandTotal = pricedLines.reduce((sum, l) => sum + l.lineTotal, 0);

  if (!can('orders.create') && !can('orders.edit')) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="font-semibold">لا صلاحية لإنشاء طلبات</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/orders">رجوع للطلبات</Link>
        </Button>
      </div>
    );
  }

  function pickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setGovernorate(c.governorate || '');
    setCity(c.city || '');
    setAddress(c.addresses.find((a) => a.isDefault)?.address || c.addresses[0]?.address || '');
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function onProductChange(key: string, productId: string) {
    const product = productMap.get(productId);
    updateLine(key, {
      productId,
      unitPrice: String(product?.estimatedPrice ?? 0),
      width: String(product?.minimumWidth || 100),
      height: String(product?.minimumHeight || 200),
    });
  }

  async function onSubmit() {
    const valid = pricedLines.filter((l) => l.productId);
    if (!valid.length) {
      toast.error('أضف منتجاً واحداً على الأقل');
      return;
    }
    try {
      const order = await mutations.create.mutateAsync({
        customerId: customerId || undefined,
        customerName,
        customerPhone,
        governorate,
        city,
        address,
        notes: notes || undefined,
        lineItems: valid.map((l) => ({
          productId: l.productId,
          width: Number(l.width) || 0,
          height: Number(l.height) || 0,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });
      toast.success(`تم إنشاء الطلب ${order.orderNumber} بالسعر ${formatCurrency(order.finalPrice ?? order.estimatedPrice)}`);
      router.push(`/orders/${order.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل إنشاء الطلب');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="طلب جديد"
        description="أضف البنود — كل منتج ينضاف بسعره مباشرة ويُحسب الإجمالي فوراً"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/orders">
              <ArrowRight className="h-4 w-4" /> رجوع
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <SectionCard title="بيانات العميل">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>عميل موجود (اختياري)</Label>
                <Select value={customerId || undefined} onValueChange={pickCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر عميلاً أو اكتب بيانات جديدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اسم العميل *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف *</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label>المحافظة</Label>
                <Input value={governorate} onChange={(e) => setGovernorate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>العنوان</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>ملاحظات</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="بنود الطلب"
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus className="h-4 w-4" /> إضافة بند
              </Button>
            }
          >
            <div className="space-y-4">
              {pricedLines.map((line, index) => (
                <div
                  key={line.key}
                  className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">بند {index + 1}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-accent">
                        {formatCurrency(line.lineTotal)}
                      </span>
                      {lines.length > 1 ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                      <Label>المنتج</Label>
                      <Select
                        value={line.productId || undefined}
                        onValueChange={(v) => onProductChange(line.key, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر منتجاً" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nameAr} — {formatCurrency(p.estimatedPrice)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>العرض (سم)</Label>
                      <Input
                        inputMode="decimal"
                        value={line.width}
                        onChange={(e) =>
                          updateLine(line.key, { width: normalizeNumericInput(e.target.value, true) })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الارتفاع (سم)</Label>
                      <Input
                        inputMode="decimal"
                        value={line.height}
                        onChange={(e) =>
                          updateLine(line.key, {
                            height: normalizeNumericInput(e.target.value, true),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الكمية</Label>
                      <Input
                        inputMode="numeric"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, {
                            quantity: normalizeNumericInput(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                      <Label>سعر الوحدة (د.ع)</Label>
                      <MoneyInput
                        value={line.unitPrice}
                        onValueChange={(digits) =>
                          updateLine(line.key, {
                            unitPrice: digits,
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        يُملأ تلقائياً من سعر المنتج ويمكن تعديله
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <SectionCard title="ملخص التسعير">
            <div className="space-y-3">
              {pricedLines
                .filter((l) => l.productId)
                .map((l) => (
                  <div key={l.key} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.product?.nameAr}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.quantity} × {formatCurrency(l.unitPrice)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatCurrency(l.lineTotal)}</p>
                  </div>
                ))}
              {!pricedLines.some((l) => l.productId) ? (
                <p className="text-sm text-muted-foreground">لم يُضف أي منتج بعد</p>
              ) : null}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">الإجمالي</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                يُحفظ الطلب مسعّراً. بعد الاعتماد ينرسل للمصنع.
                </p>
              </div>
              <Button
                className="w-full"
                variant="accent"
                disabled={mutations.create.isPending}
                onClick={() => void onSubmit()}
              >
                {mutations.create.isPending ? 'جاري الحفظ...' : 'إنشاء الطلب بالسعر'}
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
