import type { Product } from '@/domain/entities';
import type { MeasurementKey, OfferingType, PricingMode } from '@/domain/enums';
import type { MeasurementField } from '@/domain/entities';

export const PRICING_MODE_LABELS: Record<PricingMode, string> = {
  fixed: 'سعر ثابت',
  per_area: 'حسب المساحة (م²)',
  per_length: 'حسب الطول',
  per_quantity: 'حسب الكمية',
  sales_quote: 'يحتاج تسعير من المبيعات',
  none: 'بدون سعر / طلب عرض سعر',
};

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  width: 'العرض',
  height: 'الارتفاع',
  length: 'الطول',
  area: 'المساحة',
  depth: 'العمق',
  quantity: 'الكمية',
};

export const OFFERING_TYPE_LABELS: Record<OfferingType, string> = {
  product: 'منتج',
  service: 'خدمة',
};

export function defaultMeasurementFields(): MeasurementField[] {
  return [
    { key: 'width', enabled: true, required: true, min: 50, max: 300, unit: 'سم' },
    { key: 'height', enabled: true, required: true, min: 50, max: 250, unit: 'سم' },
    { key: 'length', enabled: false, required: false, min: 0, max: 1000, unit: 'سم' },
    { key: 'area', enabled: false, required: false, min: 0, max: 100, unit: 'م²' },
    { key: 'depth', enabled: false, required: false, min: 0, max: 100, unit: 'سم' },
    { key: 'quantity', enabled: true, required: true, min: 1, max: 99, unit: 'قطعة' },
  ];
}

export function fieldsFromLegacy(p: Partial<Product>): MeasurementField[] {
  const base = defaultMeasurementFields();
  return base.map((f) => {
    if (f.key === 'width') {
      return {
        ...f,
        enabled: true,
        min: Number(p.minimumWidth) || 50,
        max: Number(p.maximumWidth) || 300,
      };
    }
    if (f.key === 'height') {
      return {
        ...f,
        enabled: true,
        min: Number(p.minimumHeight) || 50,
        max: Number(p.maximumHeight) || 250,
      };
    }
    return f;
  });
}

export function deriveKind(requiresMeasurements: boolean): Product['kind'] {
  return requiresMeasurements ? 'custom' : 'ready';
}

export function isPublished(p: Pick<Product, 'published'> | { published?: boolean }): boolean {
  return p.published !== false;
}

export function requiresMeasurementsOf(p: Partial<Product>): boolean {
  if (typeof p.requiresMeasurements === 'boolean') return p.requiresMeasurements;
  return p.kind !== 'ready';
}

export type NormalizedOffering = Product & {
  offeringType: OfferingType;
  published: boolean;
  sortOrder: number;
  pricingMode: PricingMode;
  requiresMeasurements: boolean;
  measurementFields: MeasurementField[];
  requiresLocation: boolean;
};

export function normalizeOffering(raw: Product): NormalizedOffering {
  const offeringType: OfferingType = raw.offeringType ?? 'product';
  const requiresMeasurements = requiresMeasurementsOf(raw);
  const kind = deriveKind(requiresMeasurements);
  const measurementFields =
    raw.measurementFields?.length ? raw.measurementFields : fieldsFromLegacy(raw);
  const width = measurementFields.find((f) => f.key === 'width');
  const height = measurementFields.find((f) => f.key === 'height');

  return {
    ...raw,
    offeringType,
    published: raw.published !== false,
    sortOrder: Number(raw.sortOrder) || 0,
    kind,
    requiresMeasurements,
    pricingMode: raw.pricingMode ?? (kind === 'ready' ? 'fixed' : 'sales_quote'),
    requiresLocation: raw.requiresLocation ?? (offeringType === 'service' || requiresMeasurements),
    measurementFields,
    optionGroups: raw.optionGroups ?? [],
    addonIds: raw.addonIds ?? [],
    extraSpecifications: raw.extraSpecifications ?? [],
    specifications: raw.specifications ?? [],
    variants: raw.variants ?? [],
    glassTypes: raw.glassTypes ?? [],
    accessories: raw.accessories ?? [],
    colors: raw.colors ?? [],
    catalogId: raw.catalogId ?? null,
    minimumWidth: width?.min ?? raw.minimumWidth ?? 50,
    maximumWidth: width?.max ?? raw.maximumWidth ?? 300,
    minimumHeight: height?.min ?? raw.minimumHeight ?? 50,
    maximumHeight: height?.max ?? raw.maximumHeight ?? 250,
  };
}

export function isWizardOffering(p: Product): boolean {
  if (!isPublished(p)) return false;
  if (p.offeringType === 'service') return true;
  return requiresMeasurementsOf(p);
}

export function isShopOffering(p: Product): boolean {
  if (!isPublished(p)) return false;
  return (p.offeringType ?? 'product') !== 'service' && !requiresMeasurementsOf(p);
}

export function offeringFitsMeasurements(
  p: Product,
  m: { width?: number; height?: number; length?: number; area?: number; depth?: number; quantity?: number },
): boolean {
  const o = normalizeOffering(p);
  if (!o.requiresMeasurements) return o.offeringType === 'service';
  for (const field of o.measurementFields) {
    if (!field.enabled) continue;
    const value =
      field.key === 'width'
        ? Number(m.width) || 0
        : field.key === 'height'
          ? Number(m.height) || 0
          : field.key === 'length'
            ? Number(m.length) || Number(m.width) || 0
            : field.key === 'area'
              ? Number(m.area) || 0
              : field.key === 'depth'
                ? Number(m.depth) || 0
                : Number(m.quantity) || 0;
    if (field.required && value <= 0) return false;
    if (value > 0 && (value < field.min || value > field.max)) return false;
  }
  return true;
}

export function estimateOfferingPrice(
  p: Product,
  m: { width?: number; height?: number; length?: number; quantity?: number },
): number {
  const o = normalizeOffering(p);
  const qty = Math.max(1, Number(m.quantity) || 1);
  const rate = Number(o.estimatedPrice) || 0;
  switch (o.pricingMode) {
    case 'fixed':
      return rate;
    case 'per_quantity':
      return rate * qty;
    case 'per_area': {
      const w = (Number(m.width) || 0) / 100;
      const h = (Number(m.height) || 0) / 100;
      return Math.round(w * h * rate * qty);
    }
    case 'per_length': {
      const len = (Number(m.length) || Number(m.width) || 0) / 100;
      return Math.round(len * rate * qty);
    }
    case 'sales_quote':
    case 'none':
      return 0;
    default:
      return rate;
  }
}

export function pricingHint(p: Product): string {
  const o = normalizeOffering(p);
  return PRICING_MODE_LABELS[o.pricingMode];
}
