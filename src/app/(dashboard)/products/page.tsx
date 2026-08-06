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
import {
  useAccessories,
  useCatalogs,
  useCategories,
  useCrudMutation,
  useGlass,
  useProducts,
} from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { Product, ProductColor, ProductSpec } from '@/domain/entities';
import { formatCurrency } from '@/shared/lib/utils';
import { useAuth } from '@/presentation/providers/auth-provider';
import { cn } from '@/shared/lib/utils';

const DEFAULT_COLORS: ProductColor[] = [
  { id: 'ral9016', name: 'White', nameAr: 'أبيض', hex: '#F6F6F6' },
  { id: 'ral7016', name: 'Anthracite', nameAr: 'رمادي أنثراسايت', hex: '#383E42' },
  { id: 'ral9005', name: 'Black', nameAr: 'أسود', hex: '#0A0A0A' },
  { id: 'ral8014', name: 'Brown', nameAr: 'بني', hex: '#4A3526' },
];

type FormState = {
  nameAr: string;
  name: string;
  categoryId: string;
  catalogId: string;
  kind: 'ready' | 'custom';
  estimatedPrice: string;
  minimumWidth: string;
  maximumWidth: string;
  minimumHeight: string;
  maximumHeight: string;
  descriptionAr: string;
  images: string;
  variantsText: string;
  featured: boolean;
  glassTypes: string[];
  accessories: string[];
  colorIds: string[];
  extras: ProductSpec[];
};

const emptyExtra = (): ProductSpec => ({ label: '', value: '' });

function blankForm(categoryId: string, catalogId: string): FormState {
  return {
    nameAr: '',
    name: '',
    categoryId,
    catalogId,
    kind: 'custom',
    estimatedPrice: '',
    minimumWidth: '50',
    maximumWidth: '300',
    minimumHeight: '50',
    maximumHeight: '300',
    descriptionAr: '',
    images: '',
    variantsText: '',
    featured: false,
    glassTypes: [],
    accessories: [],
    colorIds: DEFAULT_COLORS.slice(0, 3).map((c) => c.id),
    extras: [],
  };
}

export default function ProductsPage() {
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useProducts();
  const categories = useCategories();
  const catalogs = useCatalogs();
  const glass = useGlass();
  const accessories = useAccessories();
  const save = useCrudMutation(['products'], (args: Parameters<typeof dataService.saveProduct>[0]) =>
    dataService.saveProduct(args)
  );
  const remove = useCrudMutation(['products'], (id: string) => dataService.deleteProduct(id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();
  const [form, setForm] = useState<FormState>(() => blankForm('', ''));

  const selected = useMemo(
    () => data?.find((p) => p.id === selectedId) ?? data?.[0],
    [data, selectedId]
  );

  const selectedCatalog = useMemo(
    () => catalogs.data?.find((c) => c.id === form.catalogId),
    [catalogs.data, form.catalogId]
  );

  const detailCatalog = useMemo(
    () => catalogs.data?.find((c) => c.id === selected?.catalogId),
    [catalogs.data, selected?.catalogId]
  );

  function openCreate() {
    setEditing(undefined);
    setForm(
      blankForm(categories.data?.[0]?.id ?? '', catalogs.data?.[0]?.id ?? '')
    );
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      nameAr: p.nameAr,
      name: p.name,
      categoryId: p.categoryId,
      catalogId: p.catalogId ?? '',
      kind: p.kind,
      estimatedPrice: String(p.estimatedPrice),
      minimumWidth: String(p.minimumWidth),
      maximumWidth: String(p.maximumWidth),
      minimumHeight: String(p.minimumHeight),
      maximumHeight: String(p.maximumHeight),
      descriptionAr: p.descriptionAr,
      images: p.images[0] ?? '',
      variantsText: (p.variants ?? []).join('\n'),
      featured: !!p.featured,
      glassTypes: [...(p.glassTypes ?? [])],
      accessories: [...(p.accessories ?? [])],
      colorIds: (p.colors?.length ? p.colors : DEFAULT_COLORS.slice(0, 3)).map((c) => c.id),
      extras: (p.extraSpecifications ?? []).map((s) => ({ ...s })),
    });
    setOpen(true);
  }

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.catalogId) {
      toast.error('اختر كتالوج المواصفات');
      return;
    }
    const extras = form.extras.filter((s) => s.label.trim() && s.value.trim());
    const colors = DEFAULT_COLORS.filter((c) => form.colorIds.includes(c.id));
    const variants = form.variantsText
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean);

    try {
      const saved = await save.mutateAsync({
        id: editing?.id,
        nameAr: form.nameAr,
        name: form.name || form.nameAr,
        categoryId: form.categoryId,
        catalogId: form.catalogId,
        kind: form.kind,
        estimatedPrice: Number(form.estimatedPrice || 0),
        minimumWidth: Number(form.minimumWidth || 50),
        maximumWidth: Number(form.maximumWidth || 300),
        minimumHeight: Number(form.minimumHeight || 50),
        maximumHeight: Number(form.maximumHeight || 300),
        descriptionAr: form.descriptionAr,
        description: form.descriptionAr,
        images: form.images ? [form.images] : editing?.images ?? [],
        extraSpecifications: extras,
        variants,
        glassTypes: form.glassTypes,
        accessories: form.accessories,
        colors,
        featured: form.featured,
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
        description="كل منتج يختار كتالوج مواصفات قياسي ثم يضبط خياراته الخاصة"
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
          title="كتالوجات المواصفات"
          value={catalogs.data?.length ?? 0}
          icon={Package}
          badge="قوالب مشتركة"
          badgeTone="info"
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
              const catName = catalogs.data?.find((c) => c.id === p.catalogId)?.nameAr;
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
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {catName ? `كتالوج: ${catName}` : 'بدون كتالوج'}
                  </p>
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
          <SectionCard title="الميزات القياسية (من الكتالوج)">
            <p className="mb-3 text-xs text-muted-foreground">
              {detailCatalog?.nameAr ?? 'غير مرتبط بكتالوج'}
            </p>
            <div className="space-y-2">
              {(detailCatalog?.specifications ?? []).map((s, i) => (
                <div
                  key={`${s.label}-${i}`}
                  className="flex justify-between rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>{s.label}</span>
                  <span className="text-muted-foreground">{s.value}</span>
                </div>
              ))}
              {(selected.extraSpecifications ?? []).map((s, i) => (
                <div
                  key={`extra-${s.label}-${i}`}
                  className="flex justify-between rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-sm"
                >
                  <span>{s.label}</span>
                  <span className="text-muted-foreground">{s.value}</span>
                </div>
              ))}
              {!detailCatalog?.specifications?.length && !(selected.extraSpecifications ?? []).length ? (
                <p className="text-sm text-muted-foreground">لا توجد مواصفات</p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="خيارات المنتج">
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">الزجاج المتوافق</p>
                <p>
                  {(glass.data ?? [])
                    .filter((g) => selected.glassTypes.includes(g.id))
                    .map((g) => g.nameAr)
                    .join(' · ') || '—'}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">الإكسسوارات</p>
                <p>
                  {(accessories.data ?? [])
                    .filter((a) => selected.accessories.includes(a.id))
                    .map((a) => a.nameAr)
                    .join(' · ') || '—'}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">المتغيرات</p>
                <p>{selected.variants.join(' · ') || '—'}</p>
              </div>
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
                {(selected.colors.length ? selected.colors : DEFAULT_COLORS.slice(0, 1)).map((c) => (
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل منتج' : 'إضافة منتج'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>الاسم بالعربي</Label>
                <Input
                  className="mt-1"
                  value={form.nameAr}
                  onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>الاسم بالإنجليزي</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>التصنيف</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  value={form.categoryId}
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
                <Label>كتالوج المواصفات *</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  value={form.catalogId}
                  onChange={(e) => setForm((f) => ({ ...f, catalogId: e.target.value }))}
                  required
                >
                  <option value="">اختر كتالوج…</option>
                  {(catalogs.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCatalog ? (
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  ميزات موروثة من «{selectedCatalog.nameAr}» (للقراءة فقط)
                </p>
                <div className="space-y-1">
                  {selectedCatalog.specifications.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{s.label}</span>
                      <span className="text-muted-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>مواصفات إضافية خاصة بالمنتج</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setForm((f) => ({ ...f, extras: [...f.extras, emptyExtra()] }))}
                >
                  <Plus className="h-3.5 w-3.5" /> إضافة
                </Button>
              </div>
              {form.extras.map((s, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder="الحقل"
                    value={s.label}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        extras: f.extras.map((row, idx) =>
                          idx === i ? { ...row, label: e.target.value } : row
                        ),
                      }))
                    }
                  />
                  <Input
                    placeholder="القيمة"
                    value={s.value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        extras: f.extras.map((row, idx) =>
                          idx === i ? { ...row, value: e.target.value } : row
                        ),
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setForm((f) => ({ ...f, extras: f.extras.filter((_, idx) => idx !== i) }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>النوع</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  value={form.kind}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kind: e.target.value as 'ready' | 'custom' }))
                  }
                >
                  <option value="custom">مخصص</option>
                  <option value="ready">جاهز</option>
                </select>
              </div>
              <div>
                <Label>السعر التقديري</Label>
                <Input
                  className="mt-1"
                  value={form.estimatedPrice}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedPrice: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-end">
                <label className="flex h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  />
                  منتج مميز
                </label>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {(
                [
                  ['minimumWidth', 'أقل عرض'],
                  ['maximumWidth', 'أعلى عرض'],
                  ['minimumHeight', 'أقل ارتفاع'],
                  ['maximumHeight', 'أعلى ارتفاع'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    className="mt-1"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>رابط الصورة</Label>
              <Input
                className="mt-1"
                value={form.images}
                onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
              />
            </div>

            <div>
              <Label>الوصف</Label>
              <Textarea
                className="mt-1"
                value={form.descriptionAr}
                onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
              />
            </div>

            <div>
              <Label>المتغيرات (سطر لكل خيار)</Label>
              <Textarea
                className="mt-1"
                placeholder={'محوري يمين\nمحوري يسار'}
                value={form.variantsText}
                onChange={(e) => setForm((f) => ({ ...f, variantsText: e.target.value }))}
              />
            </div>

            <div>
              <Label>أنواع الزجاج المتوافقة</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(glass.data ?? []).map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span>{g.nameAr}</span>
                    <input
                      type="checkbox"
                      checked={form.glassTypes.includes(g.id)}
                      onChange={() =>
                        setForm((f) => ({ ...f, glassTypes: toggleId(f.glassTypes, g.id) }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>الإكسسوارات المتوافقة</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(accessories.data ?? []).map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span>{a.nameAr}</span>
                    <input
                      type="checkbox"
                      checked={form.accessories.includes(a.id)}
                      onChange={() =>
                        setForm((f) => ({ ...f, accessories: toggleId(f.accessories, a.id) }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>الألوان المتاحة</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {DEFAULT_COLORS.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-border"
                        style={{ background: c.hex }}
                      />
                      {c.nameAr}
                    </span>
                    <input
                      type="checkbox"
                      checked={form.colorIds.includes(c.id)}
                      onChange={() =>
                        setForm((f) => ({ ...f, colorIds: toggleId(f.colorIds, c.id) }))
                      }
                    />
                  </label>
                ))}
              </div>
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
