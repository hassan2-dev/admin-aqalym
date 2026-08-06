'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/presentation/components/layout/sidebar';
import { Header } from '@/presentation/components/layout/header';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ROUTE_PERMISSIONS } from '@/shared/constants/permissions';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { ar } from '@/presentation/i18n/ar';

const PAGE_TITLES: Record<string, string> = {
  '/': ar.businessOverview,
  '/orders': ar.orders,
  '/products': ar.products,
  '/categories': ar.categories,
  '/catalogs': ar.catalogs,
  '/variants': ar.variants,
  '/glass-types': ar.glassTypes,
  '/accessories': ar.accessories,
  '/services': ar.services,
  '/customers': ar.customers,
  '/factory': ar.factory,
  '/inventory': ar.inventory,
  '/projects': ar.projects,
  '/reports': ar.reports,
  '/users': ar.users,
  '/roles': ar.roles,
  '/notifications': ar.notifications,
  '/settings': ar.settings,
};

function resolveTitle(pathname: string) {
  if (pathname.startsWith('/orders/')) return ar.orders;
  if (pathname.startsWith('/customers/')) return ar.customers;
  if (pathname.startsWith('/factory/')) return ar.factory;
  const exact = Object.entries(PAGE_TITLES).find(([route]) =>
    route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`)
  );
  return exact?.[1] ?? ar.adminPanel;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const required = Object.entries(ROUTE_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([route]) => (route === '/' ? pathname === '/' : pathname.startsWith(route)))?.[1];

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
    );
  }

  if (required && !can(required)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold">{ar.noPermission}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{pathname}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setOpen(true)} title={resolveTitle(pathname)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
