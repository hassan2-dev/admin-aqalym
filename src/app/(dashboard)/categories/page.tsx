'use client';

import { CrudPage } from '@/presentation/components/shared/crud-page';
import { useCategories, useCrudMutation } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { Category } from '@/domain/entities';
import type { CategorySlug } from '@/domain/enums';

export default function CategoriesPage() {
  const { data, isLoading, isError, refetch } = useCategories();
  const save = useCrudMutation(['categories'], dataService.saveCategory);
  const remove = useCrudMutation(['categories'], dataService.deleteCategory);

  return (
    <CrudPage<Category>
      title="التصنيفات"
      description="تصنيفات الأبواب والنوافذ والواجهات والشترات"
      headers={['الاسم', 'المعرّف', 'الترتيب']}
      items={data}
      loading={isLoading}
      error={isError}
      onRetry={() => void refetch()}
      fields={[
        { name: 'nameAr', label: 'الاسم', required: true },
        {
          name: 'slug',
          label: 'Slug',
          type: 'select',
          required: true,
          options: [
            { value: 'doors', label: 'doors' },
            { value: 'windows', label: 'windows' },
            { value: 'facades', label: 'facades' },
            { value: 'fixed_glass', label: 'fixed_glass' },
            { value: 'shutters', label: 'shutters' },
            { value: 'services', label: 'services' },
          ],
        },
        { name: 'descriptionAr', label: 'الوصف', type: 'textarea' },
        { name: 'image', label: 'رابط الصورة' },
        { name: 'order', label: 'الترتيب', type: 'number' },
      ]}
      columns={(c) => [c.nameAr, c.slug, String(c.order)]}
      mapItemToForm={(c) => ({
        nameAr: c.nameAr,
        slug: c.slug,
        descriptionAr: c.descriptionAr,
        image: c.image,
        order: String(c.order),
      })}
      onSave={async (values, editing) => {
        await save.mutateAsync({
          id: editing?.id,
          nameAr: values.nameAr!,
          name: values.nameAr!,
          slug: values.slug! as CategorySlug,
          descriptionAr: values.descriptionAr ?? '',
          description: values.descriptionAr ?? '',
          image: values.image ?? '',
          order: Number(values.order || 0),
          icon: editing?.icon ?? 'box',
        });
      }}
      onDelete={async (item) => remove.mutateAsync(item.id)}
    />
  );
}
