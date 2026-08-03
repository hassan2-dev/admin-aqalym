import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const hasHeader = Boolean(title || action);
  return (
    <Card className={cn('rounded-xl border-border shadow-soft', className)}>
      {hasHeader ? (
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div>
            {title ? <CardTitle className="text-base font-semibold">{title}</CardTitle> : null}
            {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </CardHeader>
      ) : null}
      <CardContent className={cn(!hasHeader && 'pt-6', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
