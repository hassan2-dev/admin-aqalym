'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Filter, Package, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { EmptyState } from '@/presentation/components/shared/empty-state';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useAccessories, useCategories, useCrudMutation, useGlass, useProducts } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { Product } from '@/domain/entities';
import { formatCurrency } from '@/shared/lib/utils';
import { useAuth } from '@/presentation/providers/auth-provider';
import { cn } from '@/shared/lib/utils';

export default function ProductsPage() {
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useProducts();
  const categories = useCategories();
  const glass = useGlass();
  const accessories = useAccessories();
  const save = useCrudMutation(['products'], (args: Parameters<typeof dataService.saveProduct>[0]) =>
    dataService.saveProduct(args)
  );
  const remove = useCrudMutation(['products'], (id: string) => dataService.deleteProduct(id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();
  const [form, setForm] = useState<Record<string, string>>({});

  const selected = useMemo(
    () => data?.find((p) => p.id === selectedId) ?? data?.[0],
    [data, selectedId]
  );

  function openCreate() {
    setEditing(undefined);
    setForm({
      nameAr: '',
      name: '',
      categoryId: categories.data?.[0]?.id ?? '',
      kind: 'custom',
      estimatedPrice: '',
      minimumWidth: '50',
      maximumWidth: '300',
      minimumHeight: '50',
      maximumHeight: '300',
      descriptionAr: '',
      images: '',
    });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      nameAr: p.nameAr,
      name: p.name,
      categoryId: p.categoryId,
      kind: p.kind,
      estimatedPrice: String(p.estimatedPrice),
      minimumWidth: String(p.minimumWidth),
      maximumWidth: String(p.maximumWidth),
      minimumHeight: String(p.minimumHeight),
      maximumHeight: String(p.maximumHeight),
      descriptionAr: p.descriptionAr,
      images: p.images[0] ?? '',
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const saved = await save.mutateAsync({
        id: editing?.id,
        nameAr: form.nameAr!,
        name: form.name || form.nameAr!,
        categoryId: form.categoryId!,
        kind: (form.kind as 'ready' | 'custom') || 'custom',
        estimatedPrice: Number(form.estimatedPrice || 0),
        minimumWidth: Number(form.minimumWidth || 50),
        maximumWidth: Number(form.maximumWidth || 300),
        minimumHeight: Number(form.minimumHeight || 50),
        maximumHeight: Number(form.maximumHeight || 300),
        descriptionAr: form.descriptionAr,
        description: form.descriptionAr,
        images: form.images ? [form.images] : editing?.images ?? [],
      });
      setSelectedId(saved.id);
      toast.success(editing ? 'تم التحديث بنجاح' : 'تم الإنشاء بنجاح');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="المنتجات والأنظمة"
        description="كتالوج الأنظمة المعمارية وقواعد القياس والتسعير"
        actions={
          can('products.manage') ? (
            <Button variant="accent" onClick={openCreate}>
              <Plus className="h-4 w-4" /> إضافة نظام جديد
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="إجمالي المنتجات" value={data?.length ?? 0} icon={Package} trend="+5% هذا الشهر" trendTone="success" />
        <StatCard
          title="أنواع الزجاج المتاحة"
          value={glass.data?.length ?? 0}
          icon={Package}
          badge="يتطلب مراجعة"
          badgeTone="warning"
        />
        <StatCard
          title="تصنيفات الأنظمة"
          value={categories.data?.length ?? 0}
          icon={Package}
          badge="أنظمة معمارية"
          badgeTone="info"
        />
      </div>

      <SectionCard
        title="كتالوج الأنظمة والمنتجات"
        action={
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" /> تصفية
          </Button>
        }
      >
        {!data?.length ? (
          <EmptyState title="لا توجد منتجات" actionLabel="إضافة منتج" onAction={openCreate} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {can('products.manage') ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground transition hover:bg-muted/40"
              >
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">إضافة منتج</span>
              </button>
            ) : null}
            {data.map((p) => {
              const active = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    'rounded-xl border bg-card p-4 text-right shadow-soft transition',
                    active ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-muted/50">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-semibold">{p.nameAr}</p>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {p.kind === 'ready' ? 'جاهز' : 'مخصص'}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{p.descriptionAr || '—'}</p>
                  <p className="mt-3 text-sm font-bold text-primary">
                    يبدأ من {formatCurrency(p.estimatedPrice)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {selected ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <SectionCard title="أنواع الزجاج المتاحة">
            <div className="space-y-2">
              {(glass.data ?? []).slice(0, 5).map((g) => {
                const checked = selected.glassTypes.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span>{g.nameAr}</span>
                    <input type="checkbox" checked={checked} readOnly />
                  </label>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="الإكسسوارات والمرفقات">
            <div className="grid gap-2 sm:grid-cols-2">
              {(accessories.data ?? []).slice(0, 4).map((a) => (
                <div key={a.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">{a.nameAr}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(a.price)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="القواعد الفنية والمقاسات"
            action={
              can('products.manage') ? (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(selected)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      void remove.mutateAsync(selected.id).then(() => toast.success('تم الحذف'))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : null
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="أقل عرض" value={`${selected.minimumWidth}`} />
              <Field label="أعلى عرض" value={`${selected.maximumWidth}`} />
              <Field label="أقل ارتفاع" value={`${selected.minimumHeight}`} />
              <Field label="أعلى ارتفاع" value={`${selected.maximumHeight}`} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">الألوان المتاحة</p>
              <div className="space-y-2">
                {(selected.colors.length
                  ? selected.colors
                  : [{ id: 'c1', name: 'White', nameAr: 'أبيض', hex: '#FFFFFF' }]
                ).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-border"
                        style={{ background: c.hex }}
                      />
                      {c.nameAr}
                    </span>
                    <span className="text-xs text-success">متوفر</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل منتج' : 'إضافة منتج'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            {[
              ['nameAr', 'الاسم بالعربي'],
              ['name', 'الاسم بالإنجليزي'],
              ['estimatedPrice', 'السعر التقديري'],
              ['minimumWidth', 'أقل عرض'],
              ['maximumWidth', 'أعلى عرض'],
              ['minimumHeight', 'أقل ارتفاع'],
              ['maximumHeight', 'أعلى ارتفاع'],
              ['images', 'رابط الصورة'],
            ].map(([name, label]) => (
              <div key={name}>
                <Label>{label}</Label>
                <Input
                  className="mt-1"
                  value={form[name] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                  required={name === 'nameAr' || name === 'estimatedPrice'}
                />
              </div>
            ))}
            <div>
              <Label>التصنيف</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                value={form.categoryId ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
              >
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                className="mt-1"
                value={form.descriptionAr ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full" variant="accent">
              حفظ
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
