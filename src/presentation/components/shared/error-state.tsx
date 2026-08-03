import { AlertCircle } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';

export function ErrorState({
  message = 'حدث خطأ أثناء تحميل البيانات',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      ) : null}
    </div>
  );
}
