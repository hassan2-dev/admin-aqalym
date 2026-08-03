'use client';

import { CrudPage, money } from '@/presentation/components/shared/crud-page';
import { useAccessories, useCrudMutation } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { Accessory } from '@/domain/entities';

export default function AccessoriesPage() {
  const { data, isLoading, isError, refetch } = useAccessories();
  const save = useCrudMutation(['accessories'], dataService.saveAccessory);
  const remove = useCrudMutation(['accessories'], dataService.deleteAccessory);

  return (
    <CrudPage<Accessory>
      title="الإكسسوارات"
      description="مقابض، أقفال، شبك، محركات وغيرها"
      headers={['الاسم', 'التصنيف', 'السعر']}
      items={data}
      loading={isLoading}
      error={isError}
      onRetry={() => void refetch()}
      fields={[
        { name: 'nameAr', label: 'الاسم', required: true },
        { name: 'category', label: 'التصنيف' },
        { name: 'price', label: 'السعر', type: 'number', required: true },
        { name: 'descriptionAr', label: 'الوصف', type: 'textarea' },
        { name: 'image', label: 'رابط الصورة' },
      ]}
      columns={(a) => [a.nameAr, a.category || '—', money(a.price)]}
      mapItemToForm={(a) => ({
        nameAr: a.nameAr,
        category: a.category ?? '',
        price: String(a.price),
        descriptionAr: a.descriptionAr,
        image: a.image ?? '',
      })}
      onSave={async (values, editing) => {
        await save.mutateAsync({
          id: editing?.id,
          nameAr: values.nameAr!,
          name: values.nameAr!,
          category: values.category,
          price: Number(values.price || 0),
          descriptionAr: values.descriptionAr ?? '',
          description: values.descriptionAr ?? '',
          image: values.image,
        });
      }}
      onDelete={async (item) => remove.mutateAsync(item.id)}
    />
  );
}
