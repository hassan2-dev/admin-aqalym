'use client';

import { PageHeader } from '@/presentation/components/shared/page-header';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { Badge } from '@/presentation/components/ui/badge';
import { Button } from '@/presentation/components/ui/button';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { EmptyState } from '@/presentation/components/shared/empty-state';
import { useCrudMutation, useNotifications, useOtpLogs } from '@/presentation/hooks/use-data';
import { dataService } from '@/infrastructure/repositories/data-service';
import { formatDateTime } from '@/shared/lib/utils';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const notifications = useNotifications();
  const otpLogs = useOtpLogs();
  const markRead = useCrudMutation(['notifications'], (id: string) => dataService.markNotificationRead(id));

  if (notifications.isLoading) return <Skeleton className="h-80 w-full rounded-xl" />;

  const items = notifications.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="الإشعارات" description="إشعارات النظام والدفع وسجلات OTP" />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="إشعارات النظام والدفع">
          {!items.length ? (
            <EmptyState title="لا توجد إشعارات" />
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <Badge variant={n.channel === 'push' ? 'accent' : n.channel === 'otp' ? 'warning' : 'secondary'}>
                        {n.channel}
                      </Badge>
                      {!n.read ? <Badge variant="destructive">جديد</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.read ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void markRead.mutateAsync(n.id).then(() => toast.success('تم التعليم كمقروء'))
                      }
                    >
                      قراءة
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="سجلات OTP">
          <div className="space-y-3">
            {(otpLogs.data ?? []).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"
              >
                <div>
                  <p dir="ltr" className="text-left font-medium">
                    {log.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.purpose} — {formatDateTime(log.createdAt)}
                  </p>
                </div>
                <Badge variant={log.success ? 'success' : 'destructive'}>
                  {log.success ? 'نجاح' : 'فشل'}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
