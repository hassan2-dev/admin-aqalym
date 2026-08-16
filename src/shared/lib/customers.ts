import type { Customer, Order } from '@/domain/entities';

export function normalizeCustomerPhone(phone: string): string {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.startsWith('964')) return `0${d.slice(3)}`;
  if (d.startsWith('0')) return d;
  if (d.length === 10) return `0${d}`;
  return d;
}

export function customerFromOrder(order: Pick<Order, 'customerId' | 'customerName' | 'customerPhone' | 'location' | 'createdAt' | 'updatedAt'>): Customer {
  const loc = order.location;
  return {
    id: order.customerId,
    name: order.customerName?.trim() || 'عميل',
    phone: order.customerPhone?.trim() || '',
    governorate: loc?.governorate ?? '',
    city: loc?.city ?? '',
    addresses: loc?.address
      ? [
          {
            id: `addr-${order.customerId}`,
            label: 'من الطلب',
            governorate: loc.governorate ?? '',
            city: loc.city ?? '',
            address: loc.address,
            isDefault: true,
          },
        ]
      : [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function customerFromAppUser(user: {
  id: string;
  phone?: string;
  name?: string;
  governorate?: string;
  city?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}): Customer {
  const now = new Date().toISOString();
  return {
    id: user.id,
    name: user.name?.trim() || 'حساب تطبيق',
    phone: user.phone?.trim() || '',
    governorate: user.governorate ?? '',
    city: user.city ?? '',
    addresses: user.address
      ? [
          {
            id: `addr-${user.id}`,
            label: 'العنوان',
            governorate: user.governorate ?? '',
            city: user.city ?? '',
            address: user.address,
            isDefault: true,
          },
        ]
      : [],
    notes: 'حساب من تطبيق أقاليم',
    createdAt: user.createdAt ?? now,
    updatedAt: user.updatedAt ?? now,
  };
}

/** كل من يطلب يصير عميل: دمج ملفات العملاء مع أرقام الطلبات (حسب الهاتف). */
export function mergeCustomersFromOrders(customers: Customer[], orders: Order[]): Customer[] {
  const byPhone = new Map<string, Customer>();

  for (const c of customers) {
    const key = normalizeCustomerPhone(c.phone) || c.id;
    byPhone.set(key, { ...c, addresses: c.addresses ?? [] });
  }

  const oldestFirst = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const order of oldestFirst) {
    const key = normalizeCustomerPhone(order.customerPhone) || order.customerId;
    const existing = byPhone.get(key);
    if (!existing) {
      byPhone.set(key, customerFromOrder(order));
      continue;
    }
    byPhone.set(key, {
      ...existing,
      name: existing.name || order.customerName,
      phone: existing.phone || order.customerPhone,
      governorate: existing.governorate || order.location?.governorate || '',
      city: existing.city || order.location?.city || '',
      updatedAt: order.updatedAt > existing.updatedAt ? order.updatedAt : existing.updatedAt,
    });
  }

  return [...byPhone.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function orderBelongsToCustomer(order: Pick<Order, 'customerId' | 'customerPhone'>, customer: Pick<Customer, 'id' | 'phone'>): boolean {
  if (order.customerId === customer.id) return true;
  const a = normalizeCustomerPhone(order.customerPhone);
  const b = normalizeCustomerPhone(customer.phone);
  return Boolean(a && b && a === b);
}
