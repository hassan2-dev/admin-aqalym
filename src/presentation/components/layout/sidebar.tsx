'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  Folders,
  Layers,
  Droplets,
  Puzzle,
  Wrench,
  Users,
  Building2,
  BarChart3,
  UserCog,
  Bell,
  Settings,
  X,
  Factory,
  Warehouse,
  Plus,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ar } from '@/presentation/i18n/ar';
import { useAuth } from '@/presentation/providers/auth-provider';
import type { Permission } from '@/domain/enums';
import { ROLE_LABELS } from '@/domain/enums';
import { BRAND } from '@/shared/constants/brand';
import { Button } from '@/presentation/components/ui/button';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
};

type NavGroup = {
  id: string;
  label?: string;
  collapsible?: boolean;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: 'operations',
    items: [
      { href: '/', label: ar.dashboard, icon: LayoutDashboard, permission: 'dashboard.view' },
      { href: '/orders', label: ar.orders, icon: ShoppingCart, permission: 'orders.view' },
      { href: '/products', label: ar.products, icon: Package, permission: 'products.view' },
      { href: '/factory', label: ar.factory, icon: Factory, permission: 'orders.production' },
      { href: '/inventory', label: ar.inventory, icon: Warehouse, permission: 'inventory.manage' },
      { href: '/customers', label: ar.customers, icon: Users, permission: 'customers.view' },
    ],
  },
  {
    id: 'catalog',
    label: ar.navCatalog,
    collapsible: true,
    items: [
      { href: '/catalogs', label: ar.catalogs, icon: BookOpen, permission: 'catalogs.manage' },
      { href: '/categories', label: ar.categories, icon: Folders, permission: 'categories.manage' },
      { href: '/variants', label: ar.variants, icon: Layers, permission: 'variants.manage' },
      { href: '/glass-types', label: ar.glassTypes, icon: Droplets, permission: 'glass.manage' },
      { href: '/accessories', label: ar.accessories, icon: Puzzle, permission: 'accessories.manage' },
      { href: '/services', label: ar.services, icon: Wrench, permission: 'services.manage' },
    ],
  },
  {
    id: 'business',
    label: ar.navBusiness,
    items: [
      { href: '/projects', label: ar.projects, icon: Building2, permission: 'projects.view' },
      { href: '/reports', label: ar.reports, icon: BarChart3, permission: 'reports.view' },
    ],
  },
  {
    id: 'admin',
    label: ar.navAdmin,
    collapsible: true,
    items: [
      { href: '/users', label: ar.users, icon: UserCog, permission: 'users.view' },
      { href: '/notifications', label: ar.notifications, icon: Bell, permission: 'notifications.view' },
      { href: '/settings', label: ar.settings, icon: Settings, permission: 'settings.manage' },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function groupHasActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => isActive(pathname, item.href));
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { can, logout, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    for (const g of navGroups) {
      if (g.collapsible) next[g.id] = true;
    }
    return next;
  });

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const g of navGroups) {
        if (g.collapsible && groupHasActive(pathname, g)) next[g.id] = false;
      }
      return next;
    });
  }, [pathname]);

  const initials =
    user?.name
      ?.split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('') || '؟';

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-black/40 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex h-dvh w-[260px] flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 lg:shadow-none',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 px-4">
          <Image
            src="/logo-mark.svg"
            alt={BRAND.nameAr}
            width={36}
            height={36}
            priority
            className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-white">{BRAND.name}</p>
            <p className="truncate text-[10px] text-sidebar-muted">{BRAND.tagline}</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent lg:hidden"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {(can('orders.create') || can('orders.view')) && (
          <div className="shrink-0 px-3 pb-3">
            <Button asChild variant="accent" size="sm" className="h-9 w-full rounded-lg text-sm">
              <Link href="/orders/new" onClick={onClose}>
                <Plus className="h-4 w-4" />
                {ar.newOrder}
              </Link>
            </Button>
          </div>
        )}

        <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {navGroups.map((group) => {
            const visible = group.items.filter((item) => can(item.permission));
            if (!visible.length) return null;
            const isCollapsed = Boolean(group.collapsible && collapsed[group.id]);

            return (
              <div key={group.id} className="mb-3">
                {group.label ? (
                  <button
                    type="button"
                    className={cn(
                      'mb-1 flex w-full items-center justify-between px-2.5 py-1 text-[11px] font-medium text-sidebar-muted',
                      group.collapsible && 'hover:text-sidebar-foreground'
                    )}
                    onClick={() =>
                      group.collapsible &&
                      setCollapsed((s) => ({ ...s, [group.id]: !s[group.id] }))
                    }
                  >
                    <span>{group.label}</span>
                    {group.collapsible ? (
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition-transform',
                          isCollapsed && '-rotate-90'
                        )}
                      />
                    ) : null}
                  </button>
                ) : null}

                {!isCollapsed ? (
                  <ul className="space-y-0.5">
                    {visible.map((item) => {
                      const active = isActive(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                              active
                                ? 'bg-sidebar-active text-white'
                                : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                active ? 'text-accent' : 'opacity-80'
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-8 flex-1 items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
              aria-label={ar.darkMode}
              title={ar.darkMode}
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              {ar.logout}
            </button>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-2.5 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/90 text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[10px] text-sidebar-muted">
                {user ? ROLE_LABELS[user.roleSlug] : ''}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
