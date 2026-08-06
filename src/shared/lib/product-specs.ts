import type { ProductSpec, SpecCatalog } from '@/domain/entities';

/** Merge catalog standard specs with product-only extras. */
export function mergeProductSpecifications(
  catalog: SpecCatalog | null | undefined,
  extraSpecifications: ProductSpec[] | undefined
): ProductSpec[] {
  return [...(catalog?.specifications ?? []), ...(extraSpecifications ?? [])];
}
