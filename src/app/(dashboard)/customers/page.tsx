'use client';

import Link from 'next/link';
import { CrudPage } from '@/presentation/components/shared/crud-page';
import { useCrudMutation, useCustomers } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { Customer } from '@/domain/entities';
import { IRAQI_GOVERNORATES } from '@/shared/constants/brand';

export default function CustomersPage() {
  const { data, isLoading, isError, refetch } = useCustomers();
  const save = useCrudMutation(['customers'], dataService.saveCustomer);
  const remove = useCrudMutation(['customers'], dataService.deleteCustomer);

  return (
    <CrudPage<Customer>
      title="العملاء"
      description="ملفات العملاء والمشاريع المرتبطة وسجل الطلبات"
      headers={['الاسم', 'الهاتف', 'المحافظة', 'المدينة']}
      items={data}
      loading={isLoading}
      error={isError}
      onRetry={() => void refetch()}
      fields={[
        { name: 'name', label: 'الاسم', required: true },
        { name: 'phone', label: 'الهاتف', required: true },
        { name: 'email', label: 'البريد' },
        {
          name: 'governorate',
          label: 'المحافظة',
          type: 'select',
          options: IRAQI_GOVERNORATES.map((g) => ({ value: g, label: g })),
        },
        { name: 'city', label: 'المدينة' },
        { name: 'notes', label: 'ملاحظات', type: 'textarea' },
      ]}
      columns={(c) => [
        <Link key="n" href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">
          {c.name}
        </Link>,
        <span key="p" dir="ltr">{c.phone}</span>,
        c.governorate || '—',
        c.city || '—',
      ]}
      mapItemToForm={(c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email ?? '',
        governorate: c.governorate ?? '',
        city: c.city ?? '',
        notes: c.notes ?? '',
      })}
      onSave={async (values, editing) => {
        await save.mutateAsync({
          id: editing?.id,
          name: values.name!,
          phone: values.phone!,
          email: values.email,
          governorate: values.governorate,
          city: values.city,
          notes: values.notes,
          addresses: editing?.addresses,
        });
      }}
      onDelete={async (item) => remove.mutateAsync(item.id)}
    />
  );
}
