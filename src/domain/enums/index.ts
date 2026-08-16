export type OrderStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'sent_to_factory'
  | 'in_production'
  | 'ready'
  | 'installation'
  | 'completed'
  | 'cancelled';

export type ProductKind = 'ready' | 'custom';
export type OrderKind = 'ready' | 'custom';
export type OfferingType = 'product' | 'service';
export type PricingMode =
  | 'fixed'
  | 'per_area'
  | 'per_length'
  | 'per_quantity'
  | 'sales_quote'
  | 'none';
export type MeasurementKey = 'width' | 'height' | 'length' | 'area' | 'depth' | 'quantity';
export type CategorySlug = 'doors' | 'windows' | 'facades' | 'fixed_glass' | 'shutters' | 'services';
export type StaffStatus = 'active' | 'inactive' | 'suspended';
export type InventoryTxnType = 'in' | 'out' | 'adjust';
export type NotificationChannel = 'system' | 'push' | 'otp';

export type RoleSlug =
  | 'super_admin'
  | 'admin'
  | 'sales'
  | 'factory'
  | 'warehouse'
  | 'support';

export type Permission =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.approve'
  | 'orders.reject'
  | 'orders.price'
  | 'orders.production'
  | 'orders.print'
  | 'products.view'
  | 'products.manage'
  | 'categories.manage'
  | 'catalogs.manage'
  | 'variants.manage'
  | 'glass.manage'
  | 'accessories.manage'
  | 'services.manage'
  | 'customers.view'
  | 'customers.manage'
  | 'projects.view'
  | 'projects.manage'
  | 'reports.view'
  | 'finance.view'
  | 'users.view'
  | 'users.manage'
  | 'roles.manage'
  | 'notifications.view'
  | 'notifications.manage'
  | 'settings.manage'
  | 'inventory.manage';

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'orders.view',
  'orders.create',
  'orders.edit',
  'orders.approve',
  'orders.reject',
  'orders.price',
  'orders.production',
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
  'projects.view',
  'projects.manage',
  'reports.view',
  'finance.view',
  'users.view',
  'users.manage',
  'roles.manage',
  'notifications.view',
  'notifications.manage',
  'settings.manage',
  'inventory.manage',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  submitted: 'مقدّم',
  under_review: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  sent_to_factory: 'أُرسل للمصنع',
  in_production: 'قيد الإنتاج',
  ready: 'جاهز',
  installation: 'قيد التركيب',
  completed: 'مكتمل',
  cancelled: 'ملغى',
};

export const ROLE_LABELS: Record<RoleSlug, string> = {
  super_admin: 'المشرف العام',
  admin: 'مدير',
  sales: 'المبيعات',
  factory: 'المصنع',
  warehouse: 'المستودع',
  support: 'دعم العملاء',
};
