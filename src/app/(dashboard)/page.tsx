'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Factory,
  Plus,
  ShoppingCart,
  Wallet,
  Clock,
  Package,
} from 'lucide-react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Button } from '@/presentation/components/ui/button';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { StatusBadge } from '@/presentation/components/shared/status-badge';
import { useInventory, useOrders } from '@/presentation/hooks/use-data';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ar } from '@/presentation/i18n/ar';
import { formatCurrency, formatDate } from '@/shared/lib/utils';
import { salesStage, SALES_STAGE_LABELS, isOrderPriced } from '@/shared/lib/order-flow';

export default function DashboardPage() {
  const { can, user } = useAuth();
  const isFactory = user?.roleSlug === 'factory';
  const isSales = user?.roleSlug === 'sales';
  const canSeeFinance = can('finance.view');
  const canSeePrices = can('finance.view') || can('orders.price');
  const canSeeOrders = can('orders.view');
  const canSeeInventory = can('inventory.manage');

  const orders = useOrders({ enabled: canSeeOrders && !isFactory });
  const inventory = useInventory(canSeeInventory);

  const list = orders.data ?? [];
  const items = inventory.data ?? [];

  const summary = useMemo(() => {
    return {
      total: list.length,
      pricing: list.filter((o) => salesStage(o) === 'pricing').length,
      ready: list.filter((o) => salesStage(o) === 'ready_factory').length,
      factory: list.filter((o) => salesStage(o) === 'factory').length,
      revenue: list
        .filter((o) => !['rejected', 'cancelled'].includes(o.status))
        .reduce((sum, o) => sum + (o.finalPrice ?? 0), 0),
    };
  }, [list]);

  const lowStock = items.filter((i) => i.quantity <= i.reorderLevel);
  const recent = list.slice(0, 6);

  const loading = (!isFactory && canSeeOrders && orders.isLoading) || (canSeeInventory && inventory.isLoading);
  const error = (!isFactory && canSeeOrders && orders.isError) || (canSeeInventory && inventory.isError);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        onRetry={() => {
          void orders.refetch();
          void inventory.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isFactory ? 'لوحة المصنع' : isSales ? 'لوحة المبيعات' : ar.businessOverview}
        description={
          isFactory
            ? 'المخزن وأوامر التنفيذ'
            : isSales
              ? 'الطلبات من التسعير حتى الإرسال للمصنع'
              : 'المبيعات والمصنع في شاشة واحدة'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canSeeOrders && !isFactory ? (
          <StatCard title={ar.totalOrders} value={summary.total} icon={ShoppingCart} />
        ) : canSeeInventory ? (
          <StatCard title="أصناف المخزن" value={items.length} icon={Package} />
        ) : null}
        {canSeeOrders && !isFactory ? (
          <StatCard
            title="بانتظار التسعير"
            value={summary.pricing}
            icon={Clock}
            badge={summary.pricing ? 'يحتاج سعر' : undefined}
            badgeTone="warning"
          />
        ) : null}
        {canSeeFinance ? (
          <StatCard title={ar.totalRevenue} value={summary.revenue} currency icon={Wallet} />
        ) : canSeeOrders && !isFactory ? (
          <StatCard title="جاهز للمصنع" value={summary.ready} icon={Package} />
        ) : null}
        {canSeeInventory ? (
          <StatCard
            title={ar.inventoryAlerts}
            value={`${lowStock.length} صنف`}
            icon={AlertTriangle}
            badge={lowStock.length ? ar.urgent : undefined}
            badgeTone="danger"
          />
        ) : (
          <StatCard title="في المصنع" value={summary.factory} icon={Factory} />
        )}
      </div>

      {canSeeOrders && !isFactory ? (
        <SectionCard title="مراحل المبيعات">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {(['review', 'pricing', 'approval', 'ready_factory', 'factory', 'done'] as const).map((id) => {
              const count = list.filter((o) => salesStage(o) === id).length;
              return (
                <Link
                  key={id}
                  href="/orders"
                  className="rounded-xl border border-border bg-muted/20 p-4 hover:bg-muted/40"
                >
                  <p className="text-xs text-muted-foreground">{SALES_STAGE_LABELS[id]}</p>
                  <p className="mt-1 text-2xl font-bold">{count}</p>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <div className={`grid gap-4 ${canSeeInventory && canSeeOrders && !isFactory ? 'xl:grid-cols-2' : ''}`}>
        {canSeeOrders && !isFactory ? (
          <SectionCard
            title="أحدث الطلبات"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href="/orders">{ar.viewAll}</Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {recent.length ? (
                recent.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/80 px-3 py-2.5 hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.orderNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.customerName} · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {canSeePrices ? (
                        <span className="text-xs font-semibold">
                          {isOrderPriced(o) ? formatCurrency(o.finalPrice!) : 'بدون سعر'}
                        </span>
                      ) : null}
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{ar.empty}</p>
              )}
            </div>
          </SectionCard>
        ) : null}

        {canSeeInventory ? (
          <SectionCard
            title="تنبيهات المخزن"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href="/inventory">{ar.viewAll}</Link>
              </Button>
            }
          >
            {lowStock.length ? (
              <div className="space-y-2">
                {lowStock.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.nameAr}</p>
                      <p className="text-xs text-muted-foreground">
                        المتوفر {item.quantity} {item.unit} — حد التنبيه {item.reorderLevel}
                      </p>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">كل الأصناف فوق حد التنبيه</p>
            )}
          </SectionCard>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(can('orders.create') || can('orders.edit')) && (
          <Button asChild variant="accent">
            <Link href="/orders/new">
              <Plus className="h-4 w-4" /> {ar.createOrder}
            </Link>
          </Button>
        )}
        {can('inventory.manage') ? (
          <Button asChild variant="outline">
            <Link href="/inventory">المخزن</Link>
          </Button>
        ) : null}
        {can('orders.production') ? (
          <Button asChild variant="outline">
            <Link href="/factory">أوامر التنفيذ</Link>
          </Button>
        ) : null}
        {can('catalogs.manage') ? (
          <Button asChild variant="outline">
            <Link href="/catalogs">كتالوج المواصفات</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
