'use client';

import { CrudPage } from '@/presentation/components/shared/crud-page';
import { useCrudMutation, useRoles, useStaff } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import type { StaffUser } from '@/domain/entities';
import { ROLE_LABELS } from '@/domain/enums';
import { PRIMARY_ROLE_SLUGS } from '@/shared/constants/permissions';
import { Badge } from '@/presentation/components/ui/badge';

export default function UsersPage() {
  const { data, isLoading, isError, refetch } = useStaff();
  const roles = useRoles();
  const save = useCrudMutation(['staff'], dataService.saveStaff);
  const remove = useCrudMutation(['staff'], dataService.deleteStaff);

  return (
    <CrudPage<StaffUser>
      title="المستخدمون"
      description="ثلاث شخصيات: مشرف عام، مبيعات، مصنع"
      headers={['الاسم', 'البريد', 'الدور', 'الحالة']}
      items={data}
      loading={isLoading}
      error={isError}
      onRetry={() => void refetch()}
      fields={[
        { name: 'name', label: 'الاسم', required: true },
        { name: 'email', label: 'البريد', required: true },
        { name: 'phone', label: 'الهاتف' },
        {
          name: 'roleId',
          label: 'الدور',
          type: 'select',
          required: true,
          options: (roles.data ?? [])
            .filter((r) => PRIMARY_ROLE_SLUGS.includes(r.slug))
            .map((r) => ({ value: r.id, label: r.nameAr })),
        },
        {
          name: 'status',
          label: 'الحالة',
          type: 'select',
          options: [
            { value: 'active', label: 'نشط' },
            { value: 'inactive', label: 'غير نشط' },
            { value: 'suspended', label: 'موقوف' },
          ],
        },
      ]}
      columns={(u) => [
        u.name,
        <span key="e" dir="ltr">
          {u.email}
        </span>,
        ROLE_LABELS[u.roleSlug],
        <Badge key="s" variant={u.status === 'active' ? 'success' : 'warning'}>
          {u.status === 'active' ? 'نشط' : u.status === 'inactive' ? 'غير نشط' : 'موقوف'}
        </Badge>,
      ]}
      mapItemToForm={(u) => ({
        name: u.name,
        email: u.email,
        phone: u.phone ?? '',
        roleId: u.roleId,
        status: u.status,
      })}
      onSave={async (values, editing) => {
        await save.mutateAsync({
          id: editing?.id,
          name: values.name!,
          email: values.email!,
          phone: values.phone,
          roleId: values.roleId!,
          status: (values.status as StaffUser['status']) || 'active',
        });
      }}
      onDelete={async (item) => remove.mutateAsync(item.id)}
    />
  );
}
