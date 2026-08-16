'use client';

import { Plus, Trash2 } from 'lucide-react';
import type {
  OfferingOptionGroup,
  Product,
  ProductColor,
  ProductSpec,
} from '@/domain/entities';
import type { OfferingType, PricingMode } from '@/domain/enums';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { MoneyInput } from '@/presentation/components/ui/money-input';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';
import { SpecEditor } from '@/presentation/components/shared/spec-editor';
import {
  MEASUREMENT_LABELS,
  OFFERING_TYPE_LABELS,
  PRICING_MODE_LABELS,
  defaultMeasurementFields,
  normalizeOffering,
} from '@/shared/lib/offering';
import { generateId } from '@/shared/lib/utils';
import type { MeasurementField } from '@/domain/entities';
import type { Category, SpecCatalog, Accessory, GlassType } from '@/domain/entities';

const DEFAULT_COLORS: ProductColor[] = [
  { id: 'ral9016', name: 'White', nameAr: 'أبيض', hex: '#F6F6F6' },
  { id: 'ral7016', name: 'Anthracite', nameAr: 'رمادي أنثراسايت', hex: '#383E42' },
  { id: 'ral9005', name: 'Black', nameAr: 'أسود', hex: '#0A0A0A' },
  { id: 'ral8014', name: 'Brown', nameAr: 'بني', hex: '#4A3526' },
];

export type OfferingFormState = {
  nameAr: string;
  name: string;
  categoryId: string;
  catalogId: string;
  offeringType: OfferingType;
  published: boolean;
  featured: boolean;
  sortOrder: string;
  pricingMode: PricingMode;
  estimatedPrice: string;
  requiresMeasurements: boolean;
  measurementFields: MeasurementField[];
  requiresLocation: boolean;
  descriptionAr: string;
  images: string;
  variantsText: string;
  glassTypes: string[];
  accessories: string[];
  colorIds: string[];
  extras: ProductSpec[];
  optionGroups: OfferingOptionGroup[];
  addonIds: string[];
};

export function blankOfferingForm(
  categoryId: string,
  catalogId: string,
  offeringType: OfferingType = 'product',
): OfferingFormState {
  const service = offeringType === 'service';
  return {
    nameAr: '',
    name: '',
    categoryId,
    catalogId,
    offeringType,
    published: true,
    featured: false,
    sortOrder: '0',
    pricingMode: service ? 'sales_quote' : 'sales_quote',
    estimatedPrice: '',
    requiresMeasurements: !service,
    measurementFields: defaultMeasurementFields().map((f) =>
      service && (f.key === 'width' || f.key === 'height')
        ? { ...f, enabled: false, required: false }
        : f,
    ),
    requiresLocation: true,
    descriptionAr: '',
    images: '',
    variantsText: '',
    glassTypes: [],
    accessories: [],
    colorIds: DEFAULT_COLORS.slice(0, 3).map((c) => c.id),
    extras: [],
    optionGroups: [],
    addonIds: [],
  };
}

export function offeringToForm(p: Product): OfferingFormState {
  const n = normalizeOffering(p);
  return {
    nameAr: n.nameAr,
    name: n.name,
    categoryId: n.categoryId,
    catalogId: n.catalogId ?? '',
    offeringType: n.offeringType,
    published: n.published,
    featured: !!n.featured,
    sortOrder: String(n.sortOrder ?? 0),
    pricingMode: n.pricingMode,
    estimatedPrice: String(n.estimatedPrice || ''),
    requiresMeasurements: n.requiresMeasurements,
    measurementFields: n.measurementFields.length ? n.measurementFields : defaultMeasurementFields(),
    requiresLocation: n.requiresLocation,
    descriptionAr: n.descriptionAr,
    images: n.images[0] ?? '',
    variantsText: (n.variants ?? []).join('\n'),
    glassTypes: [...(n.glassTypes ?? [])],
    accessories: [...(n.accessories ?? [])],
    colorIds: (n.colors?.length ? n.colors : DEFAULT_COLORS.slice(0, 3)).map((c) => c.id),
    extras: (n.extraSpecifications ?? []).map((s) => ({ ...s })),
    optionGroups: (n.optionGroups ?? []).map((g) => ({
      ...g,
      values: g.values.map((v) => ({ ...v })),
    })),
    addonIds: [...(n.addonIds ?? [])],
  };
}

export function OfferingBuilder({
  form,
  setForm,
  categories,
  catalogs,
  glass,
  accessories,
  allOfferings,
}: {
  form: OfferingFormState;
  setForm: (patch: Partial<OfferingFormState> | ((f: OfferingFormState) => OfferingFormState)) => void;
  categories: Category[];
  catalogs: SpecCatalog[];
  glass: GlassType[];
  accessories: Accessory[];
  allOfferings: Product[];
}) {
  const selectedCatalog = catalogs.find((c) => c.id === form.catalogId);
  const patch = (p: Partial<OfferingFormState>) =>
    setForm((f) => ({ ...f, ...p }));

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function updateField(key: MeasurementField['key'], next: Partial<MeasurementField>) {
    patch({
      measurementFields: form.measurementFields.map((f) =>
        f.key === key ? { ...f, ...next } : f,
      ),
    });
  }

  const needsPrice =
    form.pricingMode === 'fixed' ||
    form.pricingMode === 'per_area' ||
    form.pricingMode === 'per_length' ||
    form.pricingMode === 'per_quantity';

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">1) المعلومات الأساسية</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>الاسم</Label>
            <Input className="mt-1" value={form.nameAr} onChange={(e) => patch({ nameAr: e.target.value })} required />
          </div>
          <div>
            <Label>نوع العنصر</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
              value={form.offeringType}
              onChange={(e) => {
                const offeringType = e.target.value as OfferingType;
                patch({
                  offeringType,
                  pricingMode: offeringType === 'service' ? 'sales_quote' : form.pricingMode,
                  requiresLocation: offeringType === 'service' ? true : form.requiresLocation,
                });
              }}
            >
              {Object.entries(OFFERING_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>التصنيف</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
              value={form.categoryId}
              onChange={(e) => patch({ categoryId: e.target.value })}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>رابط الصورة</Label>
            <Input className="mt-1" value={form.images} onChange={(e) => patch({ images: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>الوصف</Label>
          <Textarea className="mt-1" value={form.descriptionAr} onChange={(e) => patch({ descriptionAr: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => patch({ published: e.target.checked })}
            />
            منشور للزبون
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => patch({ featured: e.target.checked })}
            />
            مميز بالرئيسية
          </label>
          <label className="flex items-center gap-2">
            ترتيب الظهور
            <Input
              className="h-8 w-20"
              value={form.sortOrder}
              onChange={(e) => patch({ sortOrder: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">2) طريقة التسعير</h3>
        <select
          className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
          value={form.pricingMode}
          onChange={(e) => patch({ pricingMode: e.target.value as PricingMode })}
        >
          {(Object.keys(PRICING_MODE_LABELS) as PricingMode[]).map((k) => (
            <option key={k} value={k}>
              {PRICING_MODE_LABELS[k]}
            </option>
          ))}
        </select>
        {needsPrice ? (
          <div>
            <Label>
              {form.pricingMode === 'fixed'
                ? 'السعر (د.ع)'
                : form.pricingMode === 'per_area'
                  ? 'سعر المتر المربع'
                  : form.pricingMode === 'per_length'
                    ? 'سعر المتر الطولي'
                    : 'سعر الوحدة'}
            </Label>
            <MoneyInput
              className="mt-1"
              value={form.estimatedPrice}
              onValueChange={(digits) => patch({ estimatedPrice: digits })}
              placeholder="مثال: 1,850,000"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            الزبون يرسل طلب، والمبيعات تحط السعر قبل ما يروح للمصنع.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">3) هل يحتاج قياسات؟</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={form.requiresMeasurements ? 'accent' : 'outline'}
            onClick={() => patch({ requiresMeasurements: true })}
          >
            نعم — يدخل محرك القياس
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!form.requiresMeasurements ? 'accent' : 'outline'}
            onClick={() => patch({ requiresMeasurements: false })}
          >
            لا — يظهر جاهز / طلب مباشر
          </Button>
        </div>
        {form.requiresMeasurements ? (
          <div className="space-y-2">
            {form.measurementFields.map((f) => (
              <div key={f.key} className="grid items-end gap-2 rounded-lg border border-border/70 p-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto]">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={(e) => updateField(f.key, { enabled: e.target.checked, required: e.target.checked })}
                  />
                  {MEASUREMENT_LABELS[f.key]}
                </label>
                <div>
                  <p className="text-[11px] text-muted-foreground">Min</p>
                  <Input
                    value={String(f.min)}
                    disabled={!f.enabled}
                    onChange={(e) => updateField(f.key, { min: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Max</p>
                  <Input
                    value={String(f.max)}
                    disabled={!f.enabled}
                    onChange={(e) => updateField(f.key, { max: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">الوحدة</p>
                  <Input
                    value={f.unit}
                    disabled={!f.enabled}
                    onChange={(e) => updateField(f.key, { unit: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={f.required}
                    disabled={!f.enabled}
                    onChange={(e) => updateField(f.key, { required: e.target.checked })}
                  />
                  إلزامي
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            إذا منتج: يظهر بالمتجر الجاهز. إذا خدمة: تظهر بعد اختيار التصنيف بدون قياس.
          </p>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requiresLocation}
            onChange={(e) => patch({ requiresLocation: e.target.checked })}
          />
          يطلب موقع التركيب / المعاينة
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">4) المواصفات (الكتالوج)</h3>
        <select
          className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
          value={form.catalogId}
          onChange={(e) => patch({ catalogId: e.target.value })}
        >
          <option value="">بدون كتالوج</option>
          {catalogs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameAr}
            </option>
          ))}
        </select>
        {selectedCatalog ? (
          <div className="rounded-xl bg-muted/20 p-3 text-sm">
            <p className="mb-2 text-xs text-muted-foreground">موروث من «{selectedCatalog.nameAr}»</p>
            {selectedCatalog.specifications.map((s, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span>{s.label}</span>
                <span className="text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        <SpecEditor
          specs={form.extras}
          onChange={(extras) => patch({ extras })}
          title="مواصفات إضافية لهذا العنصر فقط"
        />
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">5) الخيارات الخاصة بهذا العنصر</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              patch({
                optionGroups: [
                  ...form.optionGroups,
                  { id: generateId('opt'), nameAr: '', required: false, values: [{ id: generateId('val'), nameAr: '' }] },
                ],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" /> مجموعة خيارات
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          مثال منتج: زجاج / لون / مقبض. مثال خدمة: نوع التركيب / داخلي أو خارجي.
        </p>
        {form.optionGroups.map((g, gi) => (
          <div key={g.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex gap-2">
              <Input
                placeholder="اسم المجموعة (زجاج، نوع التركيب…)"
                value={g.nameAr}
                onChange={(e) =>
                  patch({
                    optionGroups: form.optionGroups.map((x, i) =>
                      i === gi ? { ...x, nameAr: e.target.value } : x,
                    ),
                  })
                }
              />
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={g.required}
                  onChange={(e) =>
                    patch({
                      optionGroups: form.optionGroups.map((x, i) =>
                        i === gi ? { ...x, required: e.target.checked } : x,
                      ),
                    })
                  }
                />
                إلزامي
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => patch({ optionGroups: form.optionGroups.filter((_, i) => i !== gi) })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {g.values.map((v, vi) => (
              <div key={v.id} className="flex gap-2">
                <Input
                  placeholder="قيمة (مزدوج، أبيض، مرتفع…)"
                  value={v.nameAr}
                  onChange={(e) =>
                    patch({
                      optionGroups: form.optionGroups.map((x, i) =>
                        i === gi
                          ? {
                              ...x,
                              values: x.values.map((val, j) =>
                                j === vi ? { ...val, nameAr: e.target.value } : val,
                              ),
                            }
                          : x,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={g.values.length <= 1}
                  onClick={() =>
                    patch({
                      optionGroups: form.optionGroups.map((x, i) =>
                        i === gi ? { ...x, values: x.values.filter((_, j) => j !== vi) } : x,
                      ),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                patch({
                  optionGroups: form.optionGroups.map((x, i) =>
                    i === gi ? { ...x, values: [...x.values, { id: generateId('val'), nameAr: '' }] } : x,
                  ),
                })
              }
            >
              إضافة قيمة
            </Button>
          </div>
        ))}

        <div>
          <Label>ألوان سريعة</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DEFAULT_COLORS.map((c) => (
              <label key={c.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border" style={{ background: c.hex }} />
                  {c.nameAr}
                </span>
                <input
                  type="checkbox"
                  checked={form.colorIds.includes(c.id)}
                  onChange={() => patch({ colorIds: toggleId(form.colorIds, c.id) })}
                />
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>زجاج متوافق (من القائمة العامة)</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {glass.map((g) => (
              <label key={g.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span>{g.nameAr}</span>
                <input
                  type="checkbox"
                  checked={form.glassTypes.includes(g.id)}
                  onChange={() => patch({ glassTypes: toggleId(form.glassTypes, g.id) })}
                />
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>إكسسوارات متوافقة</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {accessories.map((a) => (
              <label key={a.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span>{a.nameAr}</span>
                <input
                  type="checkbox"
                  checked={form.accessories.includes(a.id)}
                  onChange={() => patch({ accessories: toggleId(form.accessories, a.id) })}
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">6) الإضافات القابلة لإعادة الاستخدام</h3>
        <p className="text-[11px] text-muted-foreground">
          اختر عناصر أخرى (فك القديم، نقل، شبك…) تظهر مع هذا العرض.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {allOfferings
            .filter((o) => o.nameAr)
            .map((o) => (
              <label key={o.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span>
                  {o.nameAr}
                  <span className="ms-1 text-[11px] text-muted-foreground">
                    ({o.offeringType === 'service' ? 'خدمة' : 'منتج'})
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.addonIds.includes(o.id)}
                  onChange={() => patch({ addonIds: toggleId(form.addonIds, o.id) })}
                />
              </label>
            ))}
        </div>
      </section>
    </div>
  );
}

export { DEFAULT_COLORS };
