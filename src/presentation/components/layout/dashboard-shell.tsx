'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/presentation/components/layout/sidebar';
import { NavigationPendingProvider } from '@/presentation/components/layout/navigation-pending';
import {
  NavigationOverlay,
  NavigationProgress,
} from '@/presentation/components/layout/navigation-progress';
import { useAuth } from '@/presentation/providers/auth-provider';
import { HOME_PATH_BY_ROLE, ROUTE_PERMISSIONS } from '@/shared/constants/permissions';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { Button } from '@/presentation/components/ui/button';
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
    route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`),
  );
  return exact?.[1] ?? ar.adminPanel;
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    const home = HOME_PATH_BY_ROLE[user.roleSlug];
    if (home && pathname === '/') router.replace(home);
  }, [loading, user, pathname, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const home = HOME_PATH_BY_ROLE[user.roleSlug];
  if (required && !can(required) && !(home && pathname === '/')) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold">{ar.noPermission}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{pathname}</p>
        </div>
      </div>
    );
  }

  const title = resolveTitle(pathname);

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="no-print">
        <NavigationProgress />
        <Sidebar open={open} onClose={() => setOpen(false)} />
      </div>

      {/* mr وليس me: السايد بار يمين، فالهامش يجب أن يكون يمين أيضاً في RTL */}
      <div id="app-shell" className="flex h-dvh flex-col lg:mr-[260px]">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 no-print lg:hidden">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <div className="no-print">
            <NavigationOverlay />
          </div>
          <main className="p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <NavigationPendingProvider>
      <ShellInner>{children}</ShellInner>
    </NavigationPendingProvider>
  );
}
