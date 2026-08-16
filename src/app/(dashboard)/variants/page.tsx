'use client';

import { CrudPage, money } from '@/presentation/components/shared/crud-page';
import { parseIqdNumber } from '@/shared/lib/utils';
import { useCrudMutation, useProducts, useVariants } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { Variant } from '@/domain/entities';

export default function VariantsPage() {
  const { data, isLoading, isError, refetch } = useVariants();
  const products = useProducts();
  const save = useCrudMutation(['variants'], dataService.saveVariant);
  const remove = useCrudMutation(['variants'], dataService.deleteVariant);

  return (
    <CrudPage<Variant>
      title="المتغيرات"
      description="متغيرات المنتجات مع الأسعار والمواصفات"
      headers={['الاسم', 'المنتج', 'السعر']}
      items={data}
      loading={isLoading}
      error={isError}
      onRetry={() => void refetch()}
      fields={[
        { name: 'nameAr', label: 'الاسم', required: true },
        {
          name: 'productId',
          label: 'المنتج',
          type: 'select',
          required: true,
          options: (products.data ?? []).map((p) => ({ value: p.id, label: p.nameAr })),
        },
        { name: 'price', label: 'السعر', type: 'money', required: true },
        { name: 'minimumWidth', label: 'أقل عرض', type: 'number' },
        { name: 'maximumWidth', label: 'أعلى عرض', type: 'number' },
        { name: 'minimumHeight', label: 'أقل ارتفاع', type: 'number' },
        { name: 'maximumHeight', label: 'أعلى ارتفاع', type: 'number' },
      ]}
      columns={(v) => [
        v.nameAr,
        products.data?.find((p) => p.id === v.productId)?.nameAr ?? v.productId,
        money(v.price),
      ]}
      mapItemToForm={(v) => ({
        nameAr: v.nameAr,
        productId: v.productId,
        price: String(v.price),
        minimumWidth: String(v.minimumWidth ?? ''),
        maximumWidth: String(v.maximumWidth ?? ''),
        minimumHeight: String(v.minimumHeight ?? ''),
        maximumHeight: String(v.maximumHeight ?? ''),
      })}
      onSave={async (values, editing) => {
        await save.mutateAsync({
          id: editing?.id,
          nameAr: values.nameAr!,
          name: values.nameAr!,
          productId: values.productId!,
          price: parseIqdNumber(values.price || '0'),
          minimumWidth: values.minimumWidth ? Number(values.minimumWidth) : undefined,
          maximumWidth: values.maximumWidth ? Number(values.maximumWidth) : undefined,
          minimumHeight: values.minimumHeight ? Number(values.minimumHeight) : undefined,
          maximumHeight: values.maximumHeight ? Number(values.maximumHeight) : undefined,
        });
      }}
      onDelete={async (item) => remove.mutateAsync(item.id)}
    />
  );
}
