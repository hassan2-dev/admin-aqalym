/**
 * Unified data access layer.
 * Uses demo store when Firebase is not configured; otherwise Firestore.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import type {
  Accessory,
  AppNotification,
  Category,
  CompanySettings,
  Customer,
  GlassType,
  InventoryItem,
  InventoryTransaction,
  Order,
  OtpLog,
  Product,
  ProductionMaterial,
  ProductionOrder,
  Project,
  Role,
  ServiceItem,
  SpecCatalog,
  StaffUser,
  Variant,
} from '@/domain/entities';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/domain/enums';
import { generateId, formatCurrency } from '@/shared/lib/utils';
import { assertCanApprove, isOrderPriced } from '@/shared/lib/order-flow';
import { customerFromAppUser, customerFromOrder, mergeCustomersFromOrders } from '@/shared/lib/customers';
import { normalizeOffering } from '@/shared/lib/offering';
import { demoDb, getDemoState } from '@/infrastructure/demo/store';
import { getFirebaseDb, isDemoMode } from '@/infrastructure/firebase/client';

async function listCollection<T>(name: string): Promise<T[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

async function upsertDoc<T extends { id: string }>(name: string, data: T) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore غير متاح');
  const { id, ...rest } = data;
  await setDoc(doc(db, name, id), stripUndefined(rest as Record<string, unknown>), { merge: true });
  return data;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      out[key] = stripUndefined(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? stripUndefined(item as Record<string, unknown>)
          : item,
      );
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/** Mobile orders often omit admin-only fields — normalize before UI/mutations. */
function normalizeOrder(raw: Order): Order {
  const measurements = raw.measurements ?? { width: 0, height: 0, quantity: 1 };
  const location = raw.location ?? {
    governorate: '',
    city: '',
    address: '',
  };
  const timeline = Array.isArray(raw.timeline) ? raw.timeline : [];
  const normalizedLocation: Order['location'] = {
    governorate: location.governorate ?? '',
    city: location.city ?? '',
    address: location.address ?? '',
  };
  if (typeof location.latitude === 'number') normalizedLocation.latitude = location.latitude;
  if (typeof location.longitude === 'number') normalizedLocation.longitude = location.longitude;

  return {
    ...raw,
    selectedAccessories: raw.selectedAccessories ?? [],
    measurements: {
      width: Number(measurements.width) || 0,
      height: Number(measurements.height) || 0,
      quantity: Number(measurements.quantity) || 1,
    },
    location: normalizedLocation,
    timeline,
    estimatedPrice: Number(raw.estimatedPrice) || 0,
    orderKind: raw.orderKind ?? 'custom',
    status: raw.status ?? 'submitted',
  };
}

async function readOrderDoc(id: string): Promise<Order> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore غير متاح');
  const snap = await getDoc(doc(db, 'orders', id));
  if (!snap.exists()) throw new Error('الطلب غير موجود');
  return normalizeOrder({ id: snap.id, ...snap.data() } as Order);
}

export const dataService = {
  isDemo: isDemoMode,

  async getDashboardStats() {
    if (isDemoMode) return demoDb.getDashboardStats();
    const orders = await listCollection<Order>('orders');
    const customers = await listCollection<Customer>('customers');
    const products = await listCollection<Product>('products');
    const inventory = await listCollection<InventoryItem>('inventory');
    const today = new Date().toISOString().slice(0, 10);
    return {
      todayOrders: orders.filter((o) => o.createdAt?.startsWith(today)).length,
      pendingOrders: orders.filter((o) => ['submitted', 'under_review'].includes(o.status)).length,
      approvedOrders: orders.filter((o) => o.status === 'approved').length,
      factoryOrders: orders.filter((o) =>
        ['sent_to_factory', 'in_production', 'ready'].includes(o.status)
      ).length,
      completedOrders: orders.filter((o) => o.status === 'completed').length,
      revenue: orders
        .filter((o) => !['rejected', 'cancelled'].includes(o.status))
        .reduce((sum, o) => sum + (o.finalPrice ?? o.estimatedPrice ?? 0), 0),
      customers: customers.length,
      products: products.length,
      inventoryAlerts: inventory.filter((i) => i.quantity <= i.reorderLevel).length,
      productionActive: orders.filter((o) =>
        ['sent_to_factory', 'in_production'].includes(o.status)
      ).length,
    };
  },

  async listOrders(filters?: { status?: OrderStatus; q?: string }) {
    if (isDemoMode) return demoDb.listOrders(filters);
    let orders = (await listCollection<Order>('orders')).map(normalizeOrder);
    orders = orders.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    if (filters?.status) orders = orders.filter((o) => o.status === filters.status);
    if (filters?.q) {
      const q = filters.q.trim();
      orders = orders.filter(
        (o) =>
          o.orderNumber?.includes(q) ||
          o.customerName?.includes(q) ||
          o.customerPhone?.includes(q)
      );
    }
    return orders;
  },

  async getOrder(id: string) {
    if (isDemoMode) return demoDb.getOrder(id);
    return readOrderDoc(id);
  },

  createOrder: (...args: Parameters<typeof demoDb.createOrder>) =>
    isDemoMode
      ? demoDb.createOrder(...args)
      : demoDb.createOrder(...args).then(async (order) => {
          await upsertDoc('orders', order);
          const customer =
            getDemoState().customers.find((c) => c.id === order.customerId) ??
            customerFromOrder(order);
          await upsertDoc('customers', customer);
          return order;
        }),

  async updateOrderStatus(id: string, status: OrderStatus, note?: string, by = 'المشرف') {
    if (isDemoMode) return demoDb.updateOrderStatus(id, status, note, by);
    const order = await readOrderDoc(id);
    if (status === 'approved') assertCanApprove(order);
    const now = new Date().toISOString();
    const event: Order['timeline'][number] = {
      status,
      label: ORDER_STATUS_LABELS[status],
      at: now,
      by,
    };
    if (note?.trim()) event.note = note.trim();

    const next: Order = {
      ...order,
      status,
      updatedAt: now,
      timeline: [...order.timeline, event],
    };
    if (status === 'rejected' && note?.trim()) {
      next.rejectionReason = note.trim();
    }
    await upsertDoc('orders', next);
    return next;
  },

  async updateOrderPrice(id: string, price: number) {
    if (isDemoMode) return demoDb.updateOrderPrice(id, price);
    if (!Number.isFinite(price) || price <= 0) throw new Error('السعر يجب أن يكون أكبر من صفر');
    const order = await readOrderDoc(id);
    const now = new Date().toISOString();
    const next: Order = {
      ...order,
      finalPrice: price,
      estimatedPrice: price,
      updatedAt: now,
      timeline: [
        ...order.timeline,
        {
          status: order.status,
          label: 'تم التسعير',
          at: now,
          by: 'المبيعات',
          note: `السعر النهائي ${formatCurrency(price)}`,
        },
      ],
    };
    await upsertDoc('orders', next);
    return next;
  },

  async convertToProduction(id: string) {
    if (isDemoMode) return demoDb.convertToProduction(id);
    const current = await readOrderDoc(id);
    if (!isOrderPriced(current)) {
      throw new Error('سعّر الطلب أولاً قبل إرساله للمصنع');
    }
    if (current.status !== 'approved') {
      throw new Error('اعتمد الطلب بعد التسعير ثم أرسله للمصنع');
    }
    const order = await this.updateOrderStatus(id, 'sent_to_factory', 'أُرسل للمصنع بعد التسعير');
    const now = new Date().toISOString();
    const existing = (await this.listProductionOrders()).find((p) => p.orderId === order.id);
    if (!existing) {
      const po: ProductionOrder = {
        id: generateId('po'),
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'sent_to_factory',
        createdAt: now,
        updatedAt: now,
      };
      await upsertDoc('productionOrders', po);
    }
    return order;
  },

  async listProducts() {
    if (isDemoMode) return getDemoState().products.map(normalizeOffering);
    const rows = await listCollection<Product>('products');
    return rows.map(normalizeOffering);
  },
  saveProduct: (input: Parameters<typeof demoDb.saveProduct>[0]) =>
    isDemoMode
      ? demoDb.saveProduct(input)
      : demoDb.saveProduct(input).then((p) => upsertDoc('products', p)),
  deleteProduct: async (id: string) => {
    if (isDemoMode) return demoDb.deleteProduct(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'products', id));
  },

  async listCatalogs() {
    if (isDemoMode) return getDemoState().catalogs;
    return listCollection<SpecCatalog>('catalogs');
  },
  saveCatalog: (input: Parameters<typeof demoDb.saveCatalog>[0]) =>
    isDemoMode
      ? demoDb.saveCatalog(input)
      : demoDb.saveCatalog(input).then(async (c) => {
          await upsertDoc('catalogs', c);
          // Keep linked product denormalized specs in sync
          const products = await listCollection<Product>('products');
          await Promise.all(
            products
              .filter((p) => p.catalogId === c.id)
              .map((p) =>
                upsertDoc('products', {
                  ...p,
                  specifications: [
                    ...(c.specifications ?? []),
                    ...(p.extraSpecifications ?? []),
                  ],
                  updatedAt: new Date().toISOString(),
                })
              )
          );
          return c;
        }),
  deleteCatalog: async (id: string) => {
    if (isDemoMode) return demoDb.deleteCatalog(id);
    const products = await listCollection<Product>('products');
    if (products.some((p) => p.catalogId === id)) {
      throw new Error('لا يمكن حذف كتالوج مرتبط بمنتجات');
    }
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'catalogs', id));
  },

  async listCategories() {
    if (isDemoMode) return getDemoState().categories;
    return listCollection<Category>('categories');
  },
  saveCategory: (input: Parameters<typeof demoDb.saveCategory>[0]) =>
    isDemoMode
      ? demoDb.saveCategory(input)
      : demoDb.saveCategory(input).then((c) => upsertDoc('categories', c)),
  deleteCategory: async (id: string) => {
    if (isDemoMode) return demoDb.deleteCategory(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'categories', id));
  },

  async listVariants() {
    if (isDemoMode) return getDemoState().variants;
    return listCollection<Variant>('variants');
  },
  saveVariant: (input: Parameters<typeof demoDb.saveVariant>[0]) =>
    isDemoMode
      ? demoDb.saveVariant(input)
      : demoDb.saveVariant(input).then((v) => upsertDoc('variants', v)),
  deleteVariant: async (id: string) => {
    if (isDemoMode) return demoDb.deleteVariant(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'variants', id));
  },

  async listGlass() {
    if (isDemoMode) return getDemoState().glassTypes;
    return listCollection<GlassType>('glassTypes');
  },
  saveGlass: (input: Parameters<typeof demoDb.saveGlass>[0]) =>
    isDemoMode
      ? demoDb.saveGlass(input)
      : demoDb.saveGlass(input).then((g) => upsertDoc('glassTypes', g)),
  deleteGlass: async (id: string) => {
    if (isDemoMode) return demoDb.deleteGlass(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'glassTypes', id));
  },

  async listAccessories() {
    if (isDemoMode) return getDemoState().accessories;
    return listCollection<Accessory>('accessories');
  },
  saveAccessory: (input: Parameters<typeof demoDb.saveAccessory>[0]) =>
    isDemoMode
      ? demoDb.saveAccessory(input)
      : demoDb.saveAccessory(input).then((a) => upsertDoc('accessories', a)),
  deleteAccessory: async (id: string) => {
    if (isDemoMode) return demoDb.deleteAccessory(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'accessories', id));
  },

  async listServices() {
    if (isDemoMode) return getDemoState().services;
    return listCollection<ServiceItem>('services');
  },
  saveService: (input: Parameters<typeof demoDb.saveService>[0]) =>
    isDemoMode
      ? demoDb.saveService(input)
      : demoDb.saveService(input).then((s) => upsertDoc('services', s)),
  deleteService: async (id: string) => {
    if (isDemoMode) return demoDb.deleteService(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'services', id));
  },

  async listCustomers() {
    if (isDemoMode) {
      return mergeCustomersFromOrders(getDemoState().customers, getDemoState().orders);
    }
    const [customers, orders, appUsers] = await Promise.all([
      listCollection<Customer>('customers'),
      listCollection<Order>('orders'),
      listCollection<{
        id: string;
        phone?: string;
        name?: string;
        governorate?: string;
        city?: string;
        address?: string;
        createdAt?: string;
        updatedAt?: string;
      }>('users'),
    ]);
    const fromUsers = appUsers.map(customerFromAppUser);
    const merged = mergeCustomersFromOrders([...customers, ...fromUsers], orders);
    const known = new Set(customers.map((c) => c.id));
    for (const customer of merged) {
      if (!known.has(customer.id)) {
        void upsertDoc('customers', customer);
      }
    }
    return merged;
  },
  async saveCustomer(input: Parameters<typeof demoDb.saveCustomer>[0]) {
    if (isDemoMode) return demoDb.saveCustomer(input);
    const saved = await demoDb.saveCustomer(input).then((c) => upsertDoc('customers', c));
    const db = getFirebaseDb();
    if (db) {
      try {
        const userSnap = await getDoc(doc(db, 'users', saved.id));
        if (userSnap.exists()) {
          await setDoc(
            doc(db, 'users', saved.id),
            stripUndefined({
              name: saved.name,
              phone: saved.phone,
              governorate: saved.governorate ?? '',
              city: saved.city ?? '',
              address: saved.addresses?.[0]?.address ?? '',
              updatedAt: saved.updatedAt,
            }),
            { merge: true },
          );
        }
      } catch {
        // حساب التطبيق اختياري — ملف العميل يبقى محفوظ
      }
    }
    return saved;
  },
  deleteCustomer: async (id: string) => {
    if (isDemoMode) return demoDb.deleteCustomer(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'customers', id));
  },

  async listProjects() {
    if (isDemoMode) return getDemoState().projects;
    return listCollection<Project>('projects');
  },
  saveProject: (input: Parameters<typeof demoDb.saveProject>[0]) =>
    isDemoMode
      ? demoDb.saveProject(input)
      : demoDb.saveProject(input).then((p) => upsertDoc('projects', p)),
  deleteProject: async (id: string) => {
    if (isDemoMode) return demoDb.deleteProject(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'projects', id));
  },

  async listStaff() {
    if (isDemoMode) return getDemoState().staff;
    return listCollection<StaffUser>('staff');
  },
  saveStaff: (input: Parameters<typeof demoDb.saveStaff>[0]) =>
    isDemoMode
      ? demoDb.saveStaff(input)
      : demoDb.saveStaff(input).then((u) => upsertDoc('staff', u)),
  deleteStaff: async (id: string) => {
    if (isDemoMode) return demoDb.deleteStaff(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'staff', id));
  },

  async listRoles() {
    if (isDemoMode) return getDemoState().roles;
    return listCollection<Role>('roles');
  },
  saveRole: (input: Parameters<typeof demoDb.saveRole>[0]) =>
    isDemoMode
      ? demoDb.saveRole(input)
      : demoDb.saveRole(input).then((r) => upsertDoc('roles', r)),

  async listNotifications(): Promise<AppNotification[]> {
    if (isDemoMode) return getDemoState().notifications;
    return listCollection<AppNotification>('notifications');
  },
  markNotificationRead: (id: string) =>
    isDemoMode ? demoDb.markNotificationRead(id) : demoDb.markNotificationRead(id),

  async listOtpLogs(): Promise<OtpLog[]> {
    if (isDemoMode) return getDemoState().otpLogs;
    return listCollection<OtpLog>('otpLogs');
  },

  async getSettings() {
    if (isDemoMode) return getDemoState().settings;
    const db = getFirebaseDb();
    if (!db) return getDemoState().settings;
    const snap = await getDoc(doc(db, 'settings', 'app'));
    return (snap.exists() ? snap.data() : getDemoState().settings) as CompanySettings;
  },
  saveSettings: (input: Partial<CompanySettings>) =>
    isDemoMode
      ? demoDb.saveSettings(input)
      : demoDb.saveSettings(input).then(async (s) => {
          const db = getFirebaseDb();
          if (db) await setDoc(doc(db, 'settings', 'app'), s, { merge: true });
          return s;
        }),

  async uploadFile(file: File, folder = 'uploads') {
    if (isDemoMode) {
      return URL.createObjectURL(file);
    }
    const body = new FormData();
    body.append('file', file);
    body.append('folder', folder);
    const res = await fetch('/api/upload', { method: 'POST', body });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new Error(data.error || 'فشل رفع الملف إلى Cloudflare R2');
    }
    return data.url;
  },

  async listProductionOrders(): Promise<ProductionOrder[]> {
    if (isDemoMode) return demoDb.listProductionOrders();
    try {
      return await listCollection<ProductionOrder>('productionOrders');
    } catch (err) {
      console.warn('[factory] productionOrders read failed', err);
      return [];
    }
  },

  async updateProductionStatus(id: string, status: OrderStatus, notes?: string) {
    if (isDemoMode) return demoDb.updateProductionStatus(id, status, notes);
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore غير متاح');

    let po: ProductionOrder | null = null;
    const byId = await getDoc(doc(db, 'productionOrders', id));
    if (byId.exists()) {
      po = { id: byId.id, ...byId.data() } as ProductionOrder;
    } else {
      const all = await this.listProductionOrders();
      po = all.find((p) => p.id === id || p.orderId === id) ?? null;
    }
    if (!po) {
      // Fallback: treat id as orderId and create PO on the fly
      const order = await readOrderDoc(id);
      const now = new Date().toISOString();
      po = {
        id: `po-${Date.now()}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: now,
        updatedAt: now,
      };
    }

    const now = new Date().toISOString();
    const nextPo: ProductionOrder = {
      ...po,
      status,
      updatedAt: now,
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
      ...(status === 'in_production' && !po.startedAt ? { startedAt: now } : {}),
      ...(status === 'ready' ? { readyAt: now } : {}),
    };
    await upsertDoc('productionOrders', nextPo);
    await this.updateOrderStatus(po.orderId, status, notes ?? 'تحديث من أرضية المصنع');
    return nextPo;
  },

  async listInventory(): Promise<InventoryItem[]> {
    if (isDemoMode) return demoDb.listInventory();
    const items = await listCollection<InventoryItem>('inventory');
    return items
      .map((i) => ({
        ...i,
        quantity: Number(i.quantity) || 0,
        reorderLevel: Number(i.reorderLevel) || 0,
        nameAr: i.nameAr || i.name || i.sku,
        unit: i.unit || 'قطعة',
      }))
      .sort((a, b) => {
        const aLow = a.quantity <= a.reorderLevel ? 0 : 1;
        const bLow = b.quantity <= b.reorderLevel ? 0 : 1;
        if (aLow !== bLow) return aLow - bLow;
        return (a.nameAr || '').localeCompare(b.nameAr || '', 'ar');
      });
  },
  async listInventoryTransactions(): Promise<InventoryTransaction[]> {
    if (isDemoMode) return demoDb.listInventoryTransactions();
    try {
      const rows = await listCollection<InventoryTransaction>('inventoryTransactions');
      return rows.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    } catch {
      return [];
    }
  },

  async adjustInventory(id: string, quantity: number, note?: string) {
    if (isDemoMode) return demoDb.adjustInventory(id, quantity, note);
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore غير متاح');
    const snap = await getDoc(doc(db, 'inventory', id));
    if (!snap.exists()) throw new Error('الصنف غير موجود');
    const item = { id: snap.id, ...snap.data() } as InventoryItem;
    const now = new Date().toISOString();
    const delta = quantity - item.quantity;
    const next: InventoryItem = { ...item, quantity, updatedAt: now };
    await upsertDoc('inventory', next);
    await upsertDoc('inventoryTransactions', {
      id: `txn-${Date.now()}`,
      inventoryId: id,
      type: delta >= 0 ? 'in' : 'out',
      quantity: Math.abs(delta),
      note: note ?? 'تعديل يدوي',
      createdAt: now,
    });
    return next;
  },

  async confirmMaterialConsumption(
    orderNumber: string,
    deductions: { inventoryId: string; quantity: number }[],
  ) {
    if (isDemoMode) return demoDb.confirmMaterialConsumption(orderNumber, deductions);
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore غير متاح');
    const now = new Date().toISOString();
    const updated: InventoryItem[] = [];
    const warnings: string[] = [];
    for (const d of deductions) {
      if (d.quantity <= 0) continue;
      const snap = await getDoc(doc(db, 'inventory', d.inventoryId));
      if (!snap.exists()) continue;
      const item = { id: snap.id, ...snap.data() } as InventoryItem;
      if (item.quantity < d.quantity) {
        throw new Error(
          `المخزن ما يكفي لـ ${item.nameAr}: متوفر ${item.quantity} ${item.unit}، مطلوب ${d.quantity}`,
        );
      }
      const next: InventoryItem = {
        ...item,
        quantity: item.quantity - d.quantity,
        updatedAt: now,
      };
      if (next.quantity <= next.reorderLevel) {
        warnings.push(
          `${next.nameAr}: تبقى ${next.quantity} ${next.unit} — حد التنبيه ${next.reorderLevel}`,
        );
      }
      await upsertDoc('inventory', next);
      await upsertDoc('inventoryTransactions', {
        id: generateId('txn'),
        inventoryId: d.inventoryId,
        type: 'out',
        quantity: d.quantity,
        reference: orderNumber,
        note: `استهلاك لأمر ${orderNumber}`,
        createdAt: now,
      });
      updated.push(next);
    }
    return { items: updated, warnings };
  },

  async issueExecutionOrder(input: {
    orderId: string;
    materials: { inventoryId: string; quantity: number }[];
    notes?: string;
  }) {
    if (isDemoMode) return demoDb.issueExecutionOrder(input);
    const order = await readOrderDoc(input.orderId);
    if (!['sent_to_factory', 'in_production'].includes(order.status)) {
      throw new Error('الطلب لازم يكون واصل للمصنع أولاً');
    }
    const deductions = input.materials.filter((m) => m.quantity > 0);
    if (!deductions.length) throw new Error('حدد المواد والكميات المستخدمة');

    const result = await this.confirmMaterialConsumption(order.orderNumber, deductions);
    const inventory = await this.listInventory();
    const materials: ProductionMaterial[] = deductions.map((d) => {
      const item = inventory.find((i) => i.id === d.inventoryId);
      return {
        inventoryId: d.inventoryId,
        nameAr: item?.nameAr ?? d.inventoryId,
        sku: item?.sku ?? '',
        unit: item?.unit ?? 'قطعة',
        quantity: d.quantity,
      };
    });

    const now = new Date().toISOString();
    const allPo = await this.listProductionOrders();
    const existing = allPo.find((p) => p.orderId === order.id);
    const po: ProductionOrder = {
      id: existing?.id ?? generateId('po'),
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'in_production',
      startedAt: existing?.startedAt ?? now,
      notes: input.notes,
      materials: [...(existing?.materials ?? []), ...materials],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await upsertDoc('productionOrders', po);
    await this.updateOrderStatus(order.id, 'in_production', 'أمر تنفيذ مع خصم مواد المخزن');
    return { production: po, warnings: result.warnings };
  },

  async saveInventory(
    input: Partial<InventoryItem> & Pick<InventoryItem, 'nameAr' | 'quantity' | 'unit' | 'reorderLevel'>,
  ) {
    if (isDemoMode) return demoDb.saveInventory(input);
    const now = new Date().toISOString();
    const id = input.id || generateId('inv');
    const existing = input.id ? (await this.listInventory()).find((i) => i.id === id) : undefined;
    const item: InventoryItem = {
      id,
      sku: input.sku?.trim() || existing?.sku || `SKU-${id.slice(-6).toUpperCase()}`,
      name: input.name || input.nameAr,
      nameAr: input.nameAr,
      quantity: Number(input.quantity) || 0,
      unit: input.unit || 'قطعة',
      reorderLevel: Number(input.reorderLevel) || 0,
      updatedAt: now,
    };
    await upsertDoc('inventory', item);
    if (!existing) {
      await upsertDoc('inventoryTransactions', {
        id: generateId('txn'),
        inventoryId: id,
        type: 'in',
        quantity: item.quantity,
        note: `إضافة صنف جديد — حد التنبيه ${item.reorderLevel} ${item.unit}`,
        createdAt: now,
      });
    }
    return item;
  },

  async deleteInventory(id: string) {
    if (isDemoMode) return demoDb.deleteInventory(id);
    const db = getFirebaseDb();
    if (db) await deleteDoc(doc(db, 'inventory', id));
  },
};
