'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ShoppingCart,
  Factory,
  AlertTriangle,
  Plus,
  Package,
  FileText,
  Clock,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { ChartCard } from '@/presentation/components/shared/chart-card';
import { SectionCard } from '@/presentation/components/shared/section-card';
import { ErrorState } from '@/presentation/components/shared/error-state';
import { Button } from '@/presentation/components/ui/button';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import {
  useDashboardStats,
  useInventory,
  useNotifications,
  useOrders,
} from '@/presentation/hooks/use-data';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ar } from '@/presentation/i18n/ar';
import { formatCurrency, formatDateTime } from '@/shared/lib/utils';
import { BRAND } from '@/shared/constants/brand';
import { ORDER_STATUS_LABELS } from '@/domain/enums';

const MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export default function DashboardPage() {
  const { can } = useAuth();
  const stats = useDashboardStats();
  const orders = useOrders();
  const inventory = useInventory();
  const notifications = useNotifications();

  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    (orders.data ?? []).forEach((o) => {
      const key = o.createdAt?.slice(0, 7);
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + (o.finalPrice ?? o.estimatedPrice ?? 0));
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const monthIdx = Number(key.split('-')[1]) - 1;
        return { name: MONTH_NAMES[monthIdx] ?? key, value, key };
      });
  }, [orders.data]);

  const productionBreakdown = useMemo(() => {
    const list = orders.data ?? [];
    const inProgress = list.filter((o) => o.status === 'in_production').length;
    const waiting = list.filter((o) => o.status === 'sent_to_factory').length;
    const stopped = list.filter((o) => o.status === 'under_review').length;
    const total = Math.max(1, inProgress + waiting + stopped);
    return [
      { name: ar.inProgress, value: inProgress, pct: Math.round((inProgress / total) * 100), color: BRAND.chart.primary },
      { name: ar.waitingMaterials, value: waiting, pct: Math.round((waiting / total) * 100), color: BRAND.chart.accent },
      { name: ar.stopped, value: stopped, pct: Math.round((stopped / total) * 100), color: '#E8A0A0' },
    ];
  }, [orders.data]);

  const efficiency = useMemo(() => {
    const list = orders.data ?? [];
    const factory = list.filter((o) =>
      ['sent_to_factory', 'in_production', 'ready', 'completed'].includes(o.status)
    ).length;
    const completed = list.filter((o) => o.status === 'completed').length;
    if (!factory) return 84;
    return Math.min(99, Math.round((completed / factory) * 100) || 72);
  }, [orders.data]);

  const activity = useMemo(() => {
    const orderItems = (orders.data ?? []).slice(0, 4).map((o) => ({
      id: `order-${o.id}`,
      title: `طلب جديد ${o.orderNumber}`,
      body: `${o.customerName} — ${formatCurrency(o.finalPrice ?? o.estimatedPrice)}`,
      at: o.createdAt,
      tone: 'info' as const,
    }));
    const notifItems = (notifications.data ?? []).slice(0, 3).map((n) => ({
      id: `notif-${n.id}`,
      title: n.title,
      body: n.body,
      at: n.createdAt,
      tone: 'muted' as const,
    }));
    const lowStock = (inventory.data ?? [])
      .filter((i) => i.quantity <= i.reorderLevel)
      .slice(0, 2)
      .map((i) => ({
        id: `inv-${i.id}`,
        title: `تنبيه مخزون: ${i.nameAr}`,
        body: `المتوفر ${i.quantity} ${i.unit} — الحد الأدنى ${i.reorderLevel}`,
        at: i.updatedAt,
        tone: 'danger' as const,
      }));
    return [...orderItems, ...notifItems, ...lowStock]
      .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
      .slice(0, 6);
  }, [orders.data, notifications.data, inventory.data]);

  if (stats.isLoading || orders.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (stats.isError || orders.isError) {
    return <ErrorState onRetry={() => { void stats.refetch(); void orders.refetch(); }} />;
  }

  const s = stats.data!;
  const highlightKey = monthlyRevenue.at(-1)?.key;

  return (
    <div className="space-y-6">
      <PageHeader title={ar.businessOverview} description="ملخص العمليات والإنتاج والمخزون في الوقت الفعلي" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title={ar.totalRevenue}
          value={s.revenue}
          currency
          icon={Wallet}
          trend="+12.5%"
          trendTone="success"
        />
        <StatCard
          title={ar.totalOrders}
          value={orders.data?.length ?? s.todayOrders}
          icon={ShoppingCart}
          trend="+8.2%"
          trendTone="success"
        />
        <StatCard
          title={ar.activeProduction}
          value={`${s.productionActive ?? s.factoryOrders} خط`}
          icon={Factory}
          badge={ar.activeNow}
          badgeTone="info"
        />
        <StatCard
          title={ar.inventoryAlerts}
          value={`${s.inventoryAlerts ?? 0} صنف`}
          icon={AlertTriangle}
          badge={(s.inventoryAlerts ?? 0) > 0 ? ar.urgent : undefined}
          badgeTone="danger"
        />
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={ar.productionStatus} description={`${ar.efficiency} التشغيلية`}>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'done', value: efficiency },
                      { name: 'rest', value: 100 - efficiency },
                    ]}
                    dataKey="value"
                    innerRadius={58}
                    outerRadius={78}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                  >
                    <Cell fill={BRAND.chart.primary} />
                    <Cell fill="#E8EBF2" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{efficiency}%</span>
                <span className="text-xs text-muted-foreground">{ar.efficiency}</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {productionBreakdown.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                    <span>{row.name}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <ChartCard
          title={ar.monthlyRevenue}
          description="آخر ٦ أشهر من بيانات الطلبات الفعلية"
          empty={!monthlyRevenue.length}
          action={
            can('reports.view') ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/reports">{ar.exportCsv}</Link>
              </Button>
            ) : null
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} width={64} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {monthlyRevenue.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.key === highlightKey ? BRAND.chart.primary : BRAND.chart.muted}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title={ar.quickActions} className="xl:col-span-1">
          <div className="grid gap-2">
            {(can('orders.create') || can('orders.view')) && (
              <Button asChild variant="accent" className="justify-start">
                <Link href="/orders">
                  <Plus className="h-4 w-4" /> {ar.createOrder}
                </Link>
              </Button>
            )}
            {can('products.manage') || can('products.view') ? (
              <Button asChild variant="outline" className="justify-start">
                <Link href="/products">
                  <Package className="h-4 w-4" /> {ar.addProduct}
                </Link>
              </Button>
            ) : null}
            {can('reports.view') ? (
              <Button asChild variant="outline" className="justify-start">
                <Link href="/reports">
                  <FileText className="h-4 w-4" /> {ar.reportLog}
                </Link>
              </Button>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title={ar.recentActivity}
          className="xl:col-span-2"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/orders">{ar.viewAll}</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            {activity.length ? (
              activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/20 p-3"
                >
                  <div
                    className={
                      item.tone === 'danger'
                        ? 'mt-0.5 rounded-lg bg-destructive/10 p-2 text-destructive'
                        : 'mt-0.5 rounded-lg bg-primary/10 p-2 text-primary'
                    }
                  >
                    {item.tone === 'danger' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.at ? formatDateTime(item.at) : ''}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{ar.empty}</p>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={ar.orderStatus} description="توزيع حالات الطلبات الحالية">
        <div className="flex flex-wrap gap-2">
          {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => {
            const count = (orders.data ?? []).filter((o) => o.status === status).length;
            if (!count) return null;
            return (
              <Link
                key={status}
                href={`/orders?status=${status}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {label}: <strong className="ms-1">{count}</strong>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
