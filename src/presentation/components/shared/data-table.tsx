import { cn } from '@/shared/lib/utils';
import type { TdHTMLAttributes } from 'react';
import { EmptyState } from '@/presentation/components/shared/empty-state';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';

export function DataTable({
  headers,
  children,
  className,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle,
  emptyDescription,
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (loading) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (empty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-soft', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-muted/50 text-right">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Td({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle', className)} {...props}>
      {children}
    </td>
  );
}
