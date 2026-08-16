'use client';

import { Loader2 } from 'lucide-react';
import { useNavigationPending } from '@/presentation/components/layout/navigation-pending';
import { cn } from '@/shared/lib/utils';

export function NavigationProgress() {
  const { isNavigating } = useNavigationPending();

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden',
        !isNavigating && 'opacity-0',
      )}
      aria-hidden={!isNavigating}
    >
      <div
        className={cn(
          'h-full w-full origin-right bg-accent',
          isNavigating && 'animate-[nav-progress_1.1s_ease-in-out_infinite]',
        )}
      />
    </div>
  );
}

export function NavigationOverlay() {
  const { isNavigating } = useNavigationPending();
  if (!isNavigating) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-background/55 pt-24 backdrop-blur-[1px]">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        جاري التحميل…
      </div>
    </div>
  );
}
