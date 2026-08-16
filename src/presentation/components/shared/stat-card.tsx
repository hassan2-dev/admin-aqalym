import { cn, formatCurrency } from '@/shared/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendTone = 'accent',
  badge,
  badgeTone = 'warning',
  currency,
  className,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  trendTone?: 'accent' | 'success' | 'danger' | 'muted';
  badge?: string;
  badgeTone?: 'warning' | 'success' | 'danger' | 'info' | 'accent';
  currency?: boolean;
  className?: string;
}) {
  const trendClass = {
    accent: 'text-accent',
    success: 'text-success',
    danger: 'text-destructive',
    muted: 'text-muted-foreground',
  }[trendTone];

  const badgeClass = {
    warning: 'bg-warning/15 text-warning',
    success: 'bg-success/15 text-success',
    danger: 'bg-destructive/15 text-destructive',
    info: 'bg-info/15 text-info',
    accent: 'bg-accent/15 text-accent',
  }[badgeTone];

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 shadow-soft', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight">
            {currency && typeof value === 'number' ? formatCurrency(value) : value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {trend ? <p className={cn('text-xs font-medium', trendClass)}>{trend}</p> : null}
            {badge ? (
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', badgeClass)}>
                {badge}
              </span>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl bg-primary/8 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
