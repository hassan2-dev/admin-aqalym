import { Button } from '@/presentation/components/ui/button';
import { cn } from '@/shared/lib/utils';

export function PageHeader({
  title,
  description,
  action,
  actions,
  className,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {action ? (
          <Button variant="accent" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
