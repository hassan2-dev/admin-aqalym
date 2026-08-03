'use client';

import { Skeleton } from '@/presentation/components/ui/skeleton';
import { EmptyState } from '@/presentation/components/shared/empty-state';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { cn } from '@/shared/lib/utils';

export function ChartCard({
  title,
  description,
  action,
  loading,
  empty,
  emptyTitle = 'لا توجد بيانات للعرض',
  children,
  className,
  heightClassName = 'h-72',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  children: React.ReactNode;
  className?: string;
  heightClassName?: string;
}) {
  return (
    <SectionCard title={title} description={description} action={action} className={className}>
      {loading ? (
        <Skeleton className={cn('w-full', heightClassName)} />
      ) : empty ? (
        <EmptyState title={emptyTitle} description="ستظهر الرسوم البيانية عند توفر بيانات كافية." />
      ) : (
        <div className={cn('w-full', heightClassName)}>{children}</div>
      )}
    </SectionCard>
  );
}
