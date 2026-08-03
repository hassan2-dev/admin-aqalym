import { Inbox } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';

export function EmptyState({
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على عناصر مطابقة.',
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <div className="rounded-full bg-muted p-3">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant="accent">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
