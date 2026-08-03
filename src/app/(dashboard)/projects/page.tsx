'use client';

import { CrudPage } from '@/presentation/components/shared/crud-page';
import { useCrudMutation, useProjects } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { Project } from '@/domain/entities';
import { IRAQI_GOVERNORATES } from '@/shared/constants/brand';
import { formatDate } from '@/shared/lib/utils';

export default function ProjectsPage() {
  const { data, isLoading, isError, refetch } = useProjects();
  const save = useCrudMutation(['projects'], dataService.saveProject);
  const remove = useCrudMutation(['projects'], dataService.deleteProject);

  return (
    <CrudPage<Project>
      title="المشاريع"
      description="معرض المشاريع المكتملة والمعروضة للعملاء"
      headers={['المشروع', 'المحافظة', 'التصنيف', 'تاريخ الإنجاز']}
      items={data}
      loading={isLoading}
      error={isError}
      onRetry={() => void refetch()}
      fields={[
        { name: 'titleAr', label: 'العنوان', required: true },
        { name: 'descriptionAr', label: 'الوصف', type: 'textarea' },
        {
          name: 'governorate',
          label: 'المحافظة',
          type: 'select',
          required: true,
          options: IRAQI_GOVERNORATES.map((g) => ({ value: g, label: g })),
        },
        { name: 'category', label: 'التصنيف' },
        { name: 'completionDate', label: 'تاريخ الإنجاز (YYYY-MM-DD)', required: true },
        { name: 'images', label: 'رابط صورة' },
        { name: 'videos', label: 'رابط فيديو' },
      ]}
      columns={(p) => [
        <div key="t" className="flex items-center gap-3">
          {p.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover" />
          ) : null}
          <span>{p.titleAr}</span>
        </div>,
        p.governorate,
        p.category || '—',
        formatDate(p.completionDate),
      ]}
      mapItemToForm={(p) => ({
        titleAr: p.titleAr,
        descriptionAr: p.descriptionAr,
        governorate: p.governorate,
        category: p.category ?? '',
        completionDate: p.completionDate.slice(0, 10),
        images: p.images[0] ?? '',
        videos: p.videos[0] ?? '',
      })}
      onSave={async (values, editing) => {
        await save.mutateAsync({
          id: editing?.id,
          titleAr: values.titleAr!,
          title: values.titleAr!,
          descriptionAr: values.descriptionAr ?? '',
          description: values.descriptionAr ?? '',
          governorate: values.governorate!,
          category: values.category,
          completionDate: new Date(values.completionDate!).toISOString(),
          images: values.images ? [values.images] : editing?.images ?? [],
          videos: values.videos ? [values.videos] : editing?.videos ?? [],
        });
      }}
      onDelete={async (item) => remove.mutateAsync(item.id)}
    />
  );
}
