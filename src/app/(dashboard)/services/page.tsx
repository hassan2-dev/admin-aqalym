'use client';

import { CrudPage } from '@/presentation/components/shared/crud-page';
import { useCrudMutation, useServices } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { ServiceItem } from '@/domain/entities';

export default function ServicesPage() {
  const { data, isLoading, isError, refetch } = useServices();
  const save = useCrudMutation(['services'], dataService.saveService);
  const remove = useCrudMutation(['services'], dataService.deleteService);

  return (
    <CrudPage<ServiceItem>
      title="الخدمات"
      description="خدمات المسح الميداني والتركيب والصيانة"
      headers={['العنوان', 'الوصف']}
      items={data}
      loading={isLoading}
      error={isError}
      onRetry={() => void refetch()}
      fields={[
        { name: 'titleAr', label: 'العنوان', required: true },
        { name: 'descriptionAr', label: 'الوصف', type: 'textarea' },
        { name: 'images', label: 'رابط صورة' },
      ]}
      columns={(s) => [s.titleAr, s.descriptionAr]}
      mapItemToForm={(s) => ({
        titleAr: s.titleAr,
        descriptionAr: s.descriptionAr,
        images: s.images[0] ?? '',
      })}
      onSave={async (values, editing) => {
        await save.mutateAsync({
          id: editing?.id,
          titleAr: values.titleAr!,
          title: values.titleAr!,
          descriptionAr: values.descriptionAr ?? '',
          description: values.descriptionAr ?? '',
          images: values.images ? [values.images] : editing?.images ?? [],
        });
      }}
      onDelete={async (item) => remove.mutateAsync(item.id)}
    />
  );
}
