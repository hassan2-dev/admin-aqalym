'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Package, Plus, Pencil, Trash2, Wrench } from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { EmptyState } from '@/presentation/components/shared/empty-state';
import { Button } from '@/presentation/components/ui/button';
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
import type { OfferingType } from '@/domain/enums';
import type { Product } from '@/domain/entities';
import { formatCurrency, cn, parseIqdNumber } from '@/shared/lib/utils';
import { useAuth } from '@/presentation/providers/auth-provider';
import {
  deriveKind,
  isShopOffering,
  normalizeOffering,
  OFFERING_TYPE_LABELS,
  pricingHint,
} from '@/shared/lib/offering';
import {
  blankOfferingForm,
  DEFAULT_COLORS,
  OfferingBuilder,
  offeringToForm,
  type OfferingFormState,
} from '@/presentation/components/offerings/offering-builder';

export function OfferingsPage({
  defaultType = 'all',
}: {
  defaultType?: OfferingType | 'all';
}) {
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useProducts();
  const categories = useCategories();
  const catalogs = useCatalogs();
  const glass = useGlass();
  const accessories = useAccessories();
  const save = useCrudMutation(['products'], (args: Parameters<typeof dataService.saveProduct>[0]) =>
    dataService.saveProduct(args),
  );
  const remove = useCrudMutation(['products'], (id: string) => dataService.deleteProduct(id));

  const [filter, setFilter] = useState<OfferingType | 'all'>(defaultType);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();
  const [form, setForm] = useState<OfferingFormState>(() => blankOfferingForm('', '', defaultType === 'service' ? 'service' : 'product'));

  const offerings = useMemo(() => (data ?? []).map(normalizeOffering), [data]);
  const visible = useMemo(
    () => (filter === 'all' ? offerings : offerings.filter((o) => o.offeringType === filter)),
    [offerings, filter],
  );
  const selected = useMemo(
    () => visible.find((p) => p.id === selectedId) ?? visible[0],
    [visible, selectedId],
  );

  function applyForm(
    patch: Partial<OfferingFormState> | ((f: OfferingFormState) => OfferingFormState),
  ) {
    setForm((f) => (typeof patch === 'function' ? patch(f) : { ...f, ...patch }));
  }

  function openCreate() {
    setEditing(undefined);
    setForm(
      blankOfferingForm(
        categories.data?.[0]?.id ?? '',
        catalogs.data?.[0]?.id ?? '',
        defaultType === 'service' ? 'service' : 'product',
      ),
    );
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm(offeringToForm(p));
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const extras = form.extras.filter((s) => s.label.trim() && s.value.trim());
    const colors = DEFAULT_COLORS.filter((c) => form.colorIds.includes(c.id));
    const width = form.measurementFields.find((f) => f.key === 'width');
    const height = form.measurementFields.find((f) => f.key === 'height');
    const optionGroups = form.optionGroups
      .map((g) => ({
        ...g,
        nameAr: g.nameAr.trim(),
        values: g.values.filter((v) => v.nameAr.trim()),
      }))
      .filter((g) => g.nameAr && g.values.length);

    try {
      const saved = await save.mutateAsync({
        id: editing?.id,
        nameAr: form.nameAr,
        name: form.name || form.nameAr,
        categoryId: form.categoryId,
        catalogId: form.catalogId || null,
        offeringType: form.offeringType,
        published: form.published,
        sortOrder: Number(form.sortOrder || 0),
        kind: deriveKind(form.requiresMeasurements),
        requiresMeasurements: form.requiresMeasurements,
        measurementFields: form.measurementFields,
        pricingMode: form.pricingMode,
        requiresLocation: form.requiresLocation,
        estimatedPrice: parseIqdNumber(form.estimatedPrice || '0'),
        minimumWidth: width?.min ?? 50,
        maximumWidth: width?.max ?? 300,
        minimumHeight: height?.min ?? 50,
        maximumHeight: height?.max ?? 300,
        descriptionAr: form.descriptionAr,
        description: form.descriptionAr,
        images: form.images ? [form.images] : editing?.images ?? [],
        extraSpecifications: extras,
        optionGroups,
        addonIds: form.addonIds,
        variants: form.variantsText.split('\n').map((v) => v.trim()).filter(Boolean),
        glassTypes: form.glassTypes,
        accessories: form.accessories,
        colors,
        featured: form.featured,
      });
      setSelectedId(saved.id);
      toast.success(editing ? 'تم التحديث' : 'تم إنشاء العنصر');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const title = defaultType === 'service' ? 'الخدمات' : 'العناصر القابلة للطلب';
  const createLabel = defaultType === 'service' ? 'خدمة جديدة' : 'عنصر جديد';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="منتج أو خدمة بنفس المحرك: قياسات، تسعير، كتالوج، خيارات، إضافات"
        actions={
          can('products.manage') || can('services.manage') ? (
            <Button variant="accent" onClick={openCreate}>
              <Plus className="h-4 w-4" /> {createLabel}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="منتجات" value={offerings.filter((o) => o.offeringType === 'product').length} icon={Package} />
        <StatCard title="خدمات" value={offerings.filter((o) => o.offeringType === 'service').length} icon={Wrench} />
        <StatCard title="جاهز بدون قياس" value={offerings.filter(isShopOffering).length} icon={Package} />
      </div>

      {defaultType === 'all' ? (
        <div className="flex flex-wrap gap-2">
          {(['all', 'product', 'service'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={
                filter === id
                  ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'rounded-full border px-3 py-1.5 text-xs'
              }
            >
              {id === 'all' ? 'الكل' : OFFERING_TYPE_LABELS[id]}
            </button>
          ))}
        </div>
      ) : null}

      <SectionCard title={filter === 'service' ? 'الخدمات' : 'العروض'}>
        {!visible.length ? (
          <EmptyState title="لا توجد عناصر" actionLabel={createLabel} onAction={openCreate} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((p) => {
              const active = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    'rounded-xl border bg-card p-4 text-right shadow-soft transition',
                    active ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40',
                  )}
                >
                  <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-muted/50">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : p.offeringType === 'service' ? (
                      <Wrench className="h-10 w-10 text-muted-foreground" />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-semibold">{p.nameAr}</p>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {OFFERING_TYPE_LABELS[p.offeringType ?? 'product']}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.requiresMeasurements ? 'يحتاج قياسات' : 'بدون قياس'} · {pricingHint(p)}
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">
                    {p.pricingMode === 'sales_quote' || p.pricingMode === 'none'
                      ? 'تسعير مبيعات'
                      : formatCurrency(p.estimatedPrice)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {selected ? (
        <SectionCard
          title={selected.nameAr}
          action={
            can('products.manage') || can('services.manage') ? (
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
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <p>النوع: {OFFERING_TYPE_LABELS[selected.offeringType ?? 'product']}</p>
            <p>القياس: {selected.requiresMeasurements ? 'نعم' : 'لا'}</p>
            <p>التسعير: {pricingHint(selected)}</p>
            <p>الموقع: {selected.requiresLocation ? 'مطلوب' : 'اختياري'}</p>
            <p>الحالة: {selected.published ? 'منشور' : 'مخفي'}</p>
            <p>الخيارات: {selected.optionGroups?.length ?? 0} مجموعة</p>
          </div>
        </SectionCard>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل عنصر' : 'بناء منتج / خدمة'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <OfferingBuilder
              form={form}
              setForm={applyForm}
              categories={categories.data ?? []}
              catalogs={catalogs.data ?? []}
              glass={glass.data ?? []}
              accessories={accessories.data ?? []}
              allOfferings={offerings.filter((o) => o.id !== editing?.id)}
            />
            <Button type="submit" className="w-full" variant="accent">
              حفظ العنصر
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
