'use client';

import { CrudPage, money } from '@/presentation/components/shared/crud-page';
import { parseIqdNumber } from '@/shared/lib/utils';
import { useCrudMutation, useGlass } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { GlassType } from '@/domain/entities';

export default function GlassTypesPage() {
  const { data, isLoading, isError, refetch } = useGlass();
  const save = useCrudMutation(['glass'], dataService.saveGlass);
  const remove = useCrudMutation(['glass'], dataService.deleteGlass);

  return (
    <CrudPage<GlassType>
      title="أنواع الزجاج"
      description="السماكة واللون والسعر لكل متر مربع"
      headers={['الاسم', 'السماكة', 'اللون', 'السعر / م²']}
      items={data}
      loading={isLoading}
      error={isError}
      onRetry={() => void refetch()}
      fields={[
        { name: 'nameAr', label: 'الاسم', required: true },
        { name: 'thickness', label: 'السماكة (مم)', type: 'number' },
        { name: 'color', label: 'اللون' },
        { name: 'pricePerSqm', label: 'السعر / م²', type: 'money', required: true },
        { name: 'descriptionAr', label: 'الوصف', type: 'textarea' },
        { name: 'image', label: 'رابط الصورة' },
      ]}
      columns={(g) => [g.nameAr, g.thickness ? `${g.thickness} مم` : '—', g.color || '—', money(g.pricePerSqm)]}
      mapItemToForm={(g) => ({
        nameAr: g.nameAr,
        thickness: String(g.thickness ?? ''),
        color: g.color ?? '',
        pricePerSqm: String(g.pricePerSqm),
        descriptionAr: g.descriptionAr,
        image: g.image ?? '',
      })}
      onSave={async (values, editing) => {
        await save.mutateAsync({
          id: editing?.id,
          nameAr: values.nameAr!,
          name: values.nameAr!,
          thickness: values.thickness ? Number(values.thickness) : undefined,
          color: values.color,
          pricePerSqm: parseIqdNumber(values.pricePerSqm || '0'),
          descriptionAr: values.descriptionAr ?? '',
          description: values.descriptionAr ?? '',
          image: values.image,
        });
      }}
      onDelete={async (item) => remove.mutateAsync(item.id)}
    />
  );
}
