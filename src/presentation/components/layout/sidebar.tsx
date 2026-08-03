'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Folders,
  Layers,
  Droplets,
  Puzzle,
  Wrench,
  Users,
  Building2,
  BarChart3,
  UserCog,
  Shield,
  Bell,
  Settings,
  X,
  Factory,
  Warehouse,
  Plus,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ar } from '@/presentation/i18n/ar';
import { useAuth } from '@/presentation/providers/auth-provider';
import type { Permission } from '@/domain/enums';
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
      { href: '/roles', label: ar.roles, icon: Shield, permission: 'roles.manage' },
      { href: '/notifications', label: ar.notifications, icon: Bell, permission: 'notifications.view' },
      { href: '/settings', label: ar.settings, icon: Settings, permission: 'settings.manage' },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { can, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    catalog: true,
    admin: true,
  });

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-black/50 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[272px] flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white">{BRAND.name}</p>
              <p className="text-[11px] text-sidebar-muted">{BRAND.tagline}</p>
            </div>
          </div>
          <button
            className="rounded-lg p-2 text-sidebar-muted hover:bg-sidebar-accent lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {navGroups.map((group) => {
            const visible = group.items.filter((item) => can(item.permission));
            if (!visible.length) return null;
            const isCollapsed = group.collapsible && collapsed[group.id];

            return (
              <div key={group.id}>
                {group.label ? (
                  <button
                    type="button"
                    className={cn(
                      'mb-1 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wide text-sidebar-muted',
                      group.collapsible && 'cursor-pointer hover:text-sidebar-foreground'
                    )}
                    onClick={() =>
                      group.collapsible &&
                      setCollapsed((s) => ({ ...s, [group.id]: !s[group.id] }))
                    }
                  >
                    {group.label}
                    {group.collapsible ? (
                      <ChevronDown
                        className={cn('h-3.5 w-3.5 transition-transform', isCollapsed && 'rotate-180')}
                      />
                    ) : null}
                  </button>
                ) : null}
                {!isCollapsed ? (
                  <div className="space-y-0.5">
                    {visible.map((item) => {
                      const active = isActive(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            active
                              ? 'bg-sidebar-active text-white'
                              : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )}
                        >
                          {active ? (
                            <span className="absolute inset-y-2 end-0 w-1 rounded-s-full bg-accent" />
                          ) : null}
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-3">
          {can('orders.create') || can('orders.view') ? (
            <Button asChild variant="accent" className="w-full rounded-xl">
              <Link href="/orders" onClick={onClose}>
                <Plus className="h-4 w-4" />
                {ar.newOrder}
              </Link>
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            {ar.logout}
          </button>
        </div>
      </aside>
    </>
  );
}
