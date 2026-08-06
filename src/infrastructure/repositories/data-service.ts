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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
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
  ProductionOrder,
  Project,
  Role,
  ServiceItem,
  SpecCatalog,
  StaffUser,
  Variant,
} from '@/domain/entities';
import type { OrderStatus } from '@/domain/enums';
import { demoDb, getDemoState } from '@/infrastructure/demo/store';
import { getFirebaseDb, getFirebaseStorage, isDemoMode } from '@/infrastructure/firebase/client';
import { generateId } from '@/shared/lib/utils';

async function listCollection<T>(name: string): Promise<T[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

async function upsertDoc<T extends { id: string }>(name: string, data: T) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore غير متاح');
  await setDoc(doc(db, name, data.id), data, { merge: true });
  return data;
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
    let orders = await listCollection<Order>('orders');
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
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore غير متاح');
    const snap = await getDoc(doc(db, 'orders', id));
    if (!snap.exists()) throw new Error('الطلب غير موجود');
    return { id: snap.id, ...snap.data() } as Order;
  },

  updateOrderStatus: (...args: Parameters<typeof demoDb.updateOrderStatus>) =>
    isDemoMode
      ? demoDb.updateOrderStatus(...args)
      : demoDb.updateOrderStatus(...args).then(async (order) => {
          await upsertDoc('orders', order);
          return order;
        }),

  updateOrderPrice: (...args: Parameters<typeof demoDb.updateOrderPrice>) =>
    isDemoMode
      ? demoDb.updateOrderPrice(...args)
      : demoDb.updateOrderPrice(...args).then(async (order) => {
          await upsertDoc('orders', order);
          return order;
        }),

  convertToProduction: (...args: Parameters<typeof demoDb.convertToProduction>) =>
    isDemoMode
      ? demoDb.convertToProduction(...args)
      : demoDb.convertToProduction(...args).then(async (order) => {
          await upsertDoc('orders', order);
          return order;
        }),

  async listProducts() {
    if (isDemoMode) return getDemoState().products;
    return listCollection<Product>('products');
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
    if (isDemoMode) return getDemoState().customers;
    return listCollection<Customer>('customers');
  },
  saveCustomer: (input: Parameters<typeof demoDb.saveCustomer>[0]) =>
    isDemoMode
      ? demoDb.saveCustomer(input)
      : demoDb.saveCustomer(input).then((c) => upsertDoc('customers', c)),
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
    const storage = getFirebaseStorage();
    if (!storage) throw new Error('Storage غير متاح');
    const path = `${folder}/${generateId('file')}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },

  async listProductionOrders(): Promise<ProductionOrder[]> {
    if (isDemoMode) return demoDb.listProductionOrders();
    return listCollection<ProductionOrder>('productionOrders');
  },
  updateProductionStatus: (...args: Parameters<typeof demoDb.updateProductionStatus>) =>
    isDemoMode
      ? demoDb.updateProductionStatus(...args)
      : demoDb.updateProductionStatus(...args).then(async (po) => {
          await upsertDoc('productionOrders', po);
          const order = await demoDb.getOrder(po.orderId);
          await upsertDoc('orders', order);
          return po;
        }),

  async listInventory(): Promise<InventoryItem[]> {
    if (isDemoMode) return demoDb.listInventory();
    return listCollection<InventoryItem>('inventory');
  },
  async listInventoryTransactions(): Promise<InventoryTransaction[]> {
    if (isDemoMode) return demoDb.listInventoryTransactions();
    return listCollection<InventoryTransaction>('inventoryTransactions');
  },
  adjustInventory: (...args: Parameters<typeof demoDb.adjustInventory>) =>
    isDemoMode
      ? demoDb.adjustInventory(...args)
      : demoDb.adjustInventory(...args).then((item) => upsertDoc('inventory', item)),
  confirmMaterialConsumption: (...args: Parameters<typeof demoDb.confirmMaterialConsumption>) =>
    isDemoMode
      ? demoDb.confirmMaterialConsumption(...args)
      : demoDb.confirmMaterialConsumption(...args).then(async (items) => {
          await Promise.all(items.map((i) => upsertDoc('inventory', i)));
          return items;
        }),
};
