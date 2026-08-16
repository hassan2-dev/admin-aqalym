import type { Permission, RoleSlug } from '@/domain/enums';
import { ALL_PERMISSIONS } from '@/domain/enums';

export const PRIMARY_ROLE_SLUGS: RoleSlug[] = ['super_admin', 'sales', 'factory'];

const ORDER_SALES_ACTIONS: Permission[] = [
  'orders.create',
  'orders.edit',
  'orders.approve',
  'orders.reject',
  'orders.price',
];

function withoutOrderActions(perms: Permission[]): Permission[] {
  return perms.filter((p) => !ORDER_SALES_ACTIONS.includes(p));
}

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleSlug, Permission[]> = {
  /** الإدارة: كل شيء، والطلبات عرض فقط لأن مسار الطلب عند المبيعات */
  super_admin: withoutOrderActions([...ALL_PERMISSIONS]),
  admin: withoutOrderActions(ALL_PERMISSIONS.filter((p) => p !== 'roles.manage')),
  sales: [
    'dashboard.view',
    'orders.view',
    'orders.create',
    'orders.edit',
    'orders.approve',
    'orders.reject',
    'orders.price',
    'orders.print',
    'products.view',
    'products.manage',
    'categories.manage',
    'catalogs.manage',
    'variants.manage',
    'glass.manage',
    'accessories.manage',
    'services.manage',
    'customers.view',
    'customers.manage',
    'notifications.view',
  ],
  factory: ['orders.production', 'inventory.manage'],
  warehouse: ['inventory.manage', 'notifications.view'],
  support: [
    'dashboard.view',
    'orders.view',
    'customers.view',
    'customers.manage',
    'notifications.view',
    'notifications.manage',
  ],
};

export const HOME_PATH_BY_ROLE: Partial<Record<RoleSlug, string>> = {
  factory: '/factory',
  sales: '/orders',
};

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/': 'dashboard.view',
  '/orders/new': 'orders.create',
  '/orders': 'orders.view',
  '/products': 'products.view',
  '/categories': 'categories.manage',
  '/catalogs': 'catalogs.manage',
  '/variants': 'variants.manage',
  '/glass-types': 'glass.manage',
  '/accessories': 'accessories.manage',
  '/services': 'services.manage',
  '/customers': 'customers.view',
  '/factory': 'orders.production',
  '/inventory': 'inventory.manage',
  '/projects': 'projects.view',
  '/reports': 'finance.view',
  '/users': 'users.view',
  '/roles': 'roles.manage',
  '/notifications': 'notifications.view',
  '/settings': 'settings.manage',
};
