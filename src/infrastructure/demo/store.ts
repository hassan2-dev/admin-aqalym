'use client';

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
  ProductionOrder,
  Product,
  Project,
  Role,
  ServiceItem,
  SpecCatalog,
  StaffUser,
  Variant,
} from '@/domain/entities';
import type { OrderStatus, Permission } from '@/domain/enums';
import { ORDER_STATUS_LABELS } from '@/domain/enums';
import { DEFAULT_ROLE_PERMISSIONS } from '@/shared/constants/permissions';
import { generateId } from '@/shared/lib/utils';
import { mergeProductSpecifications } from '@/shared/lib/product-specs';
import {
  SEED_ACCESSORIES,
  SEED_CATALOGS,
  SEED_CATEGORIES,
  SEED_CUSTOMERS,
  SEED_GLASS,
  SEED_INVENTORY,
  SEED_NOTIFICATIONS,
  SEED_ORDERS,
  SEED_OTP_LOGS,
  SEED_PRODUCTS,
  SEED_PROJECTS,
  SEED_ROLES,
  SEED_SERVICES,
  SEED_SETTINGS,
  SEED_STAFF,
  SEED_VARIANTS,
} from '@/infrastructure/demo/seed';

const STORAGE_KEY = 'aqalym-admin-demo-v3';

export interface DemoState {
  catalogs: SpecCatalog[];
  categories: Category[];
  products: Product[];
  variants: Variant[];
  glassTypes: GlassType[];
  accessories: Accessory[];
  services: ServiceItem[];
  customers: Customer[];
  orders: Order[];
  productionOrders: ProductionOrder[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  projects: Project[];
  notifications: AppNotification[];
  otpLogs: OtpLog[];
  roles: Role[];
  staff: StaffUser[];
  settings: CompanySettings;
  session: StaffUser | null;
}

function initialState(): DemoState {
  return {
    catalogs: structuredClone(SEED_CATALOGS),
    categories: structuredClone(SEED_CATEGORIES),
    products: structuredClone(SEED_PRODUCTS),
    variants: structuredClone(SEED_VARIANTS),
    glassTypes: structuredClone(SEED_GLASS),
    accessories: structuredClone(SEED_ACCESSORIES),
    services: structuredClone(SEED_SERVICES),
    customers: structuredClone(SEED_CUSTOMERS),
    orders: structuredClone(SEED_ORDERS),
    productionOrders: [],
    inventory: structuredClone(SEED_INVENTORY),
    inventoryTransactions: [],
    projects: structuredClone(SEED_PROJECTS),
    notifications: structuredClone(SEED_NOTIFICATIONS),
    otpLogs: structuredClone(SEED_OTP_LOGS),
    roles: structuredClone(SEED_ROLES),
    staff: structuredClone(SEED_STAFF),
    settings: structuredClone(SEED_SETTINGS),
    session: null,
  };
}

let memory: DemoState | null = null;
const listeners = new Set<() => void>();

function load(): DemoState {
  if (memory) return memory;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        memory = JSON.parse(raw) as DemoState;
        return memory;
      }
    } catch {
      /* ignore */
    }
  }
  memory = initialState();
  return memory;
}

function persist() {
  if (typeof window !== 'undefined' && memory) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  }
  listeners.forEach((l) => l());
}

function mutate(updater: (state: DemoState) => void) {
  const state = load();
  updater(state);
  persist();
  return state;
}

export function subscribeDemo(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDemoState() {
  return load();
}

export function resetDemoStore() {
  memory = initialState();
  persist();
}

export const demoDb = {
  // Auth
  async login(email: string, password: string): Promise<StaffUser> {
    const state = load();
    const user = state.staff.find((s) => s.email.toLowerCase() === email.toLowerCase());
    if (!user || password !== 'Admin@123') {
      throw new Error('بيانات الدخول غير صحيحة');
    }
    if (user.status !== 'active') throw new Error('الحساب غير نشط');
    mutate((s) => {
      s.session = user;
    });
    return user;
  },
  async logout() {
    mutate((s) => {
      s.session = null;
    });
  },
  async currentUser() {
    return load().session;
  },
  getPermissions(user: StaffUser | null): Permission[] {
    if (!user) return [];
    const defaults = DEFAULT_ROLE_PERMISSIONS[user.roleSlug];
    if (defaults) return [...defaults];
    const role = load().roles.find((r) => r.id === user.roleId);
    return role?.permissions ?? [];
  },

  // Generic CRUD helpers
  list<K extends keyof DemoState>(key: K) {
    return load()[key];
  },

  // Orders
  async listOrders(filters?: { status?: OrderStatus; q?: string }) {
    let items = [...load().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filters?.status) items = items.filter((o) => o.status === filters.status);
    if (filters?.q) {
      const q = filters.q.trim();
      items = items.filter(
        (o) =>
          o.orderNumber.includes(q) ||
          o.customerName.includes(q) ||
          o.customerPhone.includes(q) ||
          o.productName.includes(q)
      );
    }
    return items;
  },
  async getOrder(id: string) {
    const order = load().orders.find((o) => o.id === id);
    if (!order) throw new Error('الطلب غير موجود');
    return order;
  },

  async createOrder(input: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    governorate?: string;
    city?: string;
    address?: string;
    notes?: string;
    lineItems: Array<{
      productId: string;
      width: number;
      height: number;
      quantity: number;
      unitPrice: number;
    }>;
  }) {
    if (!input.customerName.trim()) throw new Error('اسم العميل مطلوب');
    if (!input.customerPhone.trim()) throw new Error('رقم الهاتف مطلوب');
    if (!input.lineItems.length) throw new Error('أضف منتجاً واحداً على الأقل');

    const now = new Date().toISOString();
    const state = load();
    const lines = input.lineItems.map((line, index) => {
      const product = state.products.find((p) => p.id === line.productId);
      if (!product) throw new Error('منتج غير موجود');
      const category = state.categories.find((c) => c.id === product.categoryId);
      const qty = Math.max(1, line.quantity || 1);
      const unitPrice = Math.max(0, line.unitPrice);
      return {
        id: `line-${index + 1}`,
        productId: product.id,
        productName: product.nameAr,
        productImage: product.images[0],
        categoryId: product.categoryId,
        categoryName: category?.nameAr ?? '',
        width: line.width || product.minimumWidth || 0,
        height: line.height || product.minimumHeight || 0,
        quantity: qty,
        unitPrice,
        lineTotal: unitPrice * qty,
      };
    });

    const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const primary = lines[0]!;
    const primaryProduct = state.products.find((p) => p.id === primary.productId)!;
    const category = state.categories.find((c) => c.id === primary.categoryId);
    const year = new Date().getFullYear();
    const seq = String(state.orders.length + 1).padStart(3, '0');

    let customerId = input.customerId;
    if (!customerId) {
      const existing = state.customers.find(
        (c) => c.phone === input.customerPhone || c.name === input.customerName
      );
      customerId = existing?.id ?? generateId('cust');
      if (!existing) {
        mutate((s) => {
          s.customers.unshift({
            id: customerId!,
            name: input.customerName.trim(),
            phone: input.customerPhone.trim(),
            governorate: input.governorate ?? '',
            city: input.city ?? '',
            addresses: input.address
              ? [
                  {
                    id: generateId('addr'),
                    label: 'افتراضي',
                    governorate: input.governorate ?? '',
                    city: input.city ?? '',
                    address: input.address,
                    isDefault: true,
                  },
                ]
              : [],
            createdAt: now,
            updatedAt: now,
          });
        });
      }
    }

    const order: Order = {
      id: generateId('ord'),
      orderNumber: `AQ-${year}-${seq}`,
      customerId: customerId!,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      orderKind: primaryProduct.kind === 'ready' ? 'ready' : 'custom',
      categoryId: primary.categoryId,
      categorySlug: (category?.slug ?? 'doors') as Order['categorySlug'],
      categoryName: primary.categoryName,
      productId: primary.productId,
      productName:
        lines.length > 1
          ? `${primary.productName} +${lines.length - 1}`
          : primary.productName,
      productImage: primary.productImage,
      measurements: {
        width: primary.width,
        height: primary.height,
        quantity: lines.reduce((s, l) => s + l.quantity, 0),
      },
      selectedAccessories: [],
      location: {
        governorate: input.governorate ?? '',
        city: input.city ?? '',
        address: input.address ?? '',
      },
      estimatedPrice: total,
      finalPrice: total,
      lineItems: lines,
      status: 'approved',
      notes: input.notes,
      images: [],
      timeline: [
        {
          status: 'submitted',
          label: 'تم الإرسال',
          at: now,
          by: 'المشرف',
        },
        {
          status: 'approved',
          label: 'معتمد ومسعّر',
          at: now,
          by: 'المشرف',
          note: `تم التسعير مباشرة عند الإنشاء — ${total.toLocaleString('ar-IQ')} د.ع`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    mutate((s) => {
      s.orders.unshift(order);
      const cust = s.customers.find((c) => c.id === order.customerId);
      if (cust) cust.updatedAt = now;
      s.notifications.unshift({
        id: generateId('notif'),
        title: 'طلب جديد مسعّر',
        body: `${order.orderNumber} — ${order.customerName} — ${total.toLocaleString('ar-IQ')} د.ع`,
        channel: 'system',
        orderId: order.id,
        read: false,
        createdAt: now,
      });
    });

    return order;
  },

  async updateOrderStatus(id: string, status: OrderStatus, note?: string, by = 'المشرف') {
    const now = new Date().toISOString();
    mutate((s) => {
      const order = s.orders.find((o) => o.id === id);
      if (!order) throw new Error('الطلب غير موجود');
      order.status = status;
      order.updatedAt = now;
      if (status === 'rejected') order.rejectionReason = note;
      order.timeline.push({
        status,
        label: ORDER_STATUS_LABELS[status],
        at: now,
        by,
        note,
      });
      s.notifications.unshift({
        id: generateId('notif'),
        title: `تحديث الطلب ${order.orderNumber}`,
        body: `الحالة: ${ORDER_STATUS_LABELS[status]}`,
        channel: 'system',
        orderId: order.id,
        read: false,
        createdAt: now,
      });
    });
    return this.getOrder(id);
  },
  async updateOrderPrice(id: string, price: number) {
    mutate((s) => {
      const order = s.orders.find((o) => o.id === id);
      if (!order) throw new Error('الطلب غير موجود');
      order.finalPrice = price;
      order.estimatedPrice = price;
      order.updatedAt = new Date().toISOString();
    });
    return this.getOrder(id);
  },
  async convertToProduction(id: string) {
    const order = await this.updateOrderStatus(id, 'sent_to_factory', 'تحويل لأمر إنتاج');
    const now = new Date().toISOString();
    mutate((s) => {
      s.productionOrders.unshift({
        id: generateId('po'),
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'sent_to_factory',
        createdAt: now,
        updatedAt: now,
      });
      // Deduct inventory sample
      const inv = s.inventory[0];
      if (inv) {
        const qty = Math.max(1, order.measurements.quantity * 2);
        inv.quantity = Math.max(0, inv.quantity - qty);
        inv.updatedAt = now;
        s.inventoryTransactions.unshift({
          id: generateId('txn'),
          inventoryId: inv.id,
          type: 'out',
          quantity: qty,
          reference: order.orderNumber,
          note: 'خصم تلقائي عند التحويل للإنتاج',
          createdAt: now,
        });
      }
    });
    await this.updateOrderStatus(id, 'in_production', 'بدء الإنتاج في المصنع');
    return this.getOrder(id);
  },

  // Products
  async saveProduct(input: Partial<Product> & Pick<Product, 'nameAr' | 'categoryId'>) {
    const now = new Date().toISOString();
    let id = input.id;
    mutate((s) => {
      const catalogId = input.catalogId !== undefined ? input.catalogId : undefined;
      const extras =
        input.extraSpecifications !== undefined ? input.extraSpecifications : undefined;
      if (id) {
        const idx = s.products.findIndex((p) => p.id === id);
        if (idx >= 0) {
          const prev = s.products[idx]!;
          const nextCatalogId = catalogId !== undefined ? catalogId : prev.catalogId;
          const nextExtras = extras !== undefined ? extras : prev.extraSpecifications ?? [];
          const catalog = s.catalogs.find((c) => c.id === nextCatalogId);
          s.products[idx] = {
            ...prev,
            ...input,
            catalogId: nextCatalogId ?? null,
            extraSpecifications: nextExtras,
            specifications:
              input.specifications ??
              mergeProductSpecifications(catalog, nextExtras),
            updatedAt: now,
          } as Product;
        }
      } else {
        id = generateId('prod');
        const cat = s.categories.find((c) => c.id === input.categoryId);
        const nextCatalogId = catalogId ?? null;
        const nextExtras = extras ?? [];
        const catalog = s.catalogs.find((c) => c.id === nextCatalogId);
        s.products.unshift({
          id,
          categoryId: input.categoryId,
          categorySlug: cat?.slug ?? 'doors',
          kind: input.kind ?? 'custom',
          name: input.name ?? input.nameAr,
          nameAr: input.nameAr,
          description: input.description ?? '',
          descriptionAr: input.descriptionAr ?? '',
          images: input.images ?? [],
          minimumWidth: input.minimumWidth ?? 50,
          maximumWidth: input.maximumWidth ?? 300,
          minimumHeight: input.minimumHeight ?? 50,
          maximumHeight: input.maximumHeight ?? 300,
          estimatedPrice: input.estimatedPrice ?? 0,
          catalogId: nextCatalogId,
          extraSpecifications: nextExtras,
          specifications:
            input.specifications ?? mergeProductSpecifications(catalog, nextExtras),
          variants: input.variants ?? [],
          glassTypes: input.glassTypes ?? [],
          accessories: input.accessories ?? [],
          colors: input.colors ?? [],
          featured: input.featured ?? false,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    return load().products.find((p) => p.id === id)!;
  },
  async deleteProduct(id: string) {
    mutate((s) => {
      s.products = s.products.filter((p) => p.id !== id);
      s.variants = s.variants.filter((v) => v.productId !== id);
    });
  },

  async saveCatalog(input: Partial<SpecCatalog> & Pick<SpecCatalog, 'nameAr'>) {
    const now = new Date().toISOString();
    let id = input.id;
    mutate((s) => {
      if (id) {
        const idx = s.catalogs.findIndex((c) => c.id === id);
        if (idx >= 0) {
          const next = {
            ...s.catalogs[idx]!,
            ...input,
            updatedAt: now,
          } as SpecCatalog;
          s.catalogs[idx] = next;
          // Refresh denormalized product specs for linked products
          s.products = s.products.map((p) => {
            if (p.catalogId !== id) return p;
            return {
              ...p,
              specifications: mergeProductSpecifications(next, p.extraSpecifications ?? []),
              updatedAt: now,
            };
          });
        }
      } else {
        id = generateId('catalog');
        s.catalogs.unshift({
          id,
          name: input.name ?? input.nameAr,
          nameAr: input.nameAr,
          description: input.description ?? '',
          descriptionAr: input.descriptionAr ?? '',
          specifications: input.specifications ?? [],
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    return load().catalogs.find((c) => c.id === id)!;
  },
  async deleteCatalog(id: string) {
    mutate((s) => {
      const linked = s.products.some((p) => p.catalogId === id);
      if (linked) throw new Error('لا يمكن حذف كتالوج مرتبط بمنتجات');
      s.catalogs = s.catalogs.filter((c) => c.id !== id);
    });
  },

  // Categories
  async saveCategory(input: Partial<Category> & Pick<Category, 'nameAr' | 'slug'>) {
    const now = Date.now();
    let id = input.id;
    mutate((s) => {
      if (id) {
        const idx = s.categories.findIndex((c) => c.id === id);
        if (idx >= 0) s.categories[idx] = { ...s.categories[idx]!, ...input } as Category;
      } else {
        id = generateId('cat');
        s.categories.push({
          id,
          slug: input.slug,
          name: input.name ?? input.nameAr,
          nameAr: input.nameAr,
          description: input.description ?? '',
          descriptionAr: input.descriptionAr ?? '',
          icon: input.icon ?? 'box',
          image: input.image ?? '',
          order: input.order ?? s.categories.length + 1,
        });
      }
    });
    void now;
    return load().categories.find((c) => c.id === id)!;
  },
  async deleteCategory(id: string) {
    mutate((s) => {
      s.categories = s.categories.filter((c) => c.id !== id);
    });
  },

  // Variants
  async saveVariant(input: Partial<Variant> & Pick<Variant, 'productId' | 'nameAr' | 'price'>) {
    const now = new Date().toISOString();
    let id = input.id;
    mutate((s) => {
      if (id) {
        const idx = s.variants.findIndex((v) => v.id === id);
        if (idx >= 0) s.variants[idx] = { ...s.variants[idx]!, ...input, updatedAt: now } as Variant;
      } else {
        id = generateId('var');
        s.variants.unshift({
          id,
          productId: input.productId,
          name: input.name ?? input.nameAr,
          nameAr: input.nameAr,
          price: input.price,
          images: input.images ?? [],
          specifications: input.specifications ?? [],
          minimumWidth: input.minimumWidth,
          maximumWidth: input.maximumWidth,
          minimumHeight: input.minimumHeight,
          maximumHeight: input.maximumHeight,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    return load().variants.find((v) => v.id === id)!;
  },
  async deleteVariant(id: string) {
    mutate((s) => {
      s.variants = s.variants.filter((v) => v.id !== id);
    });
  },

  // Glass
  async saveGlass(input: Partial<GlassType> & Pick<GlassType, 'nameAr' | 'pricePerSqm'>) {
    let id = input.id;
    mutate((s) => {
      if (id) {
        const idx = s.glassTypes.findIndex((g) => g.id === id);
        if (idx >= 0) s.glassTypes[idx] = { ...s.glassTypes[idx]!, ...input } as GlassType;
      } else {
        id = generateId('glass');
        s.glassTypes.unshift({
          id,
          name: input.name ?? input.nameAr,
          nameAr: input.nameAr,
          description: input.description ?? '',
          descriptionAr: input.descriptionAr ?? '',
          thickness: input.thickness,
          color: input.color,
          pricePerSqm: input.pricePerSqm,
          image: input.image,
        });
      }
    });
    return load().glassTypes.find((g) => g.id === id)!;
  },
  async deleteGlass(id: string) {
    mutate((s) => {
      s.glassTypes = s.glassTypes.filter((g) => g.id !== id);
    });
  },

  // Accessories
  async saveAccessory(input: Partial<Accessory> & Pick<Accessory, 'nameAr' | 'price'>) {
    let id = input.id;
    mutate((s) => {
      if (id) {
        const idx = s.accessories.findIndex((a) => a.id === id);
        if (idx >= 0) s.accessories[idx] = { ...s.accessories[idx]!, ...input } as Accessory;
      } else {
        id = generateId('acc');
        s.accessories.unshift({
          id,
          category: input.category,
          name: input.name ?? input.nameAr,
          nameAr: input.nameAr,
          description: input.description ?? '',
          descriptionAr: input.descriptionAr ?? '',
          price: input.price,
          image: input.image,
        });
      }
    });
    return load().accessories.find((a) => a.id === id)!;
  },
  async deleteAccessory(id: string) {
    mutate((s) => {
      s.accessories = s.accessories.filter((a) => a.id !== id);
    });
  },

  // Services
  async saveService(input: Partial<ServiceItem> & Pick<ServiceItem, 'titleAr'>) {
    const now = new Date().toISOString();
    let id = input.id;
    mutate((s) => {
      if (id) {
        const idx = s.services.findIndex((x) => x.id === id);
        if (idx >= 0) s.services[idx] = { ...s.services[idx]!, ...input, updatedAt: now } as ServiceItem;
      } else {
        id = generateId('svc');
        s.services.unshift({
          id,
          title: input.title ?? input.titleAr,
          titleAr: input.titleAr,
          description: input.description ?? '',
          descriptionAr: input.descriptionAr ?? '',
          images: input.images ?? [],
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    return load().services.find((x) => x.id === id)!;
  },
  async deleteService(id: string) {
    mutate((s) => {
      s.services = s.services.filter((x) => x.id !== id);
    });
  },

  // Customers
  async saveCustomer(input: Partial<Customer> & Pick<Customer, 'name' | 'phone'>) {
    const now = new Date().toISOString();
    let id = input.id;
    mutate((s) => {
      if (id) {
        const idx = s.customers.findIndex((c) => c.id === id);
        if (idx >= 0) s.customers[idx] = { ...s.customers[idx]!, ...input, updatedAt: now } as Customer;
      } else {
        id = generateId('cust');
        s.customers.unshift({
          id,
          name: input.name,
          phone: input.phone,
          email: input.email,
          governorate: input.governorate,
          city: input.city,
          addresses: input.addresses ?? [],
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    return load().customers.find((c) => c.id === id)!;
  },
  async deleteCustomer(id: string) {
    mutate((s) => {
      s.customers = s.customers.filter((c) => c.id !== id);
    });
  },

  // Projects
  async saveProject(input: Partial<Project> & Pick<Project, 'titleAr' | 'governorate' | 'completionDate'>) {
    const now = new Date().toISOString();
    let id = input.id;
    mutate((s) => {
      if (id) {
        const idx = s.projects.findIndex((p) => p.id === id);
        if (idx >= 0) s.projects[idx] = { ...s.projects[idx]!, ...input, updatedAt: now } as Project;
      } else {
        id = generateId('proj');
        s.projects.unshift({
          id,
          title: input.title ?? input.titleAr,
          titleAr: input.titleAr,
          description: input.description ?? '',
          descriptionAr: input.descriptionAr ?? '',
          governorate: input.governorate,
          images: input.images ?? [],
          videos: input.videos ?? [],
          completionDate: input.completionDate,
          category: input.category,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    return load().projects.find((p) => p.id === id)!;
  },
  async deleteProject(id: string) {
    mutate((s) => {
      s.projects = s.projects.filter((p) => p.id !== id);
    });
  },

  // Staff / Roles
  async saveStaff(input: Partial<StaffUser> & Pick<StaffUser, 'email' | 'name' | 'roleId'>) {
    const now = new Date().toISOString();
    let id = input.id;
    mutate((s) => {
      const role = s.roles.find((r) => r.id === input.roleId)!;
      if (id) {
        const idx = s.staff.findIndex((u) => u.id === id);
        if (idx >= 0) {
          s.staff[idx] = {
            ...s.staff[idx]!,
            ...input,
            roleSlug: role.slug,
            updatedAt: now,
          } as StaffUser;
        }
      } else {
        id = generateId('staff');
        s.staff.unshift({
          id,
          email: input.email,
          name: input.name,
          phone: input.phone,
          roleId: input.roleId,
          roleSlug: role.slug,
          status: input.status ?? 'active',
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    return load().staff.find((u) => u.id === id)!;
  },
  async deleteStaff(id: string) {
    mutate((s) => {
      s.staff = s.staff.filter((u) => u.id !== id);
    });
  },
  async saveRole(input: Partial<Role> & Pick<Role, 'nameAr' | 'slug' | 'permissions'>) {
    let id = input.id;
    if (id) {
      const existing = load().roles.find((r) => r.id === id);
      if (existing?.isSystem) {
        throw new Error('صلاحيات الأدوار النظامية ثابتة ولا يمكن تعديلها');
      }
    }
    mutate((s) => {
      if (id) {
        const idx = s.roles.findIndex((r) => r.id === id);
        if (idx >= 0) s.roles[idx] = { ...s.roles[idx]!, ...input } as Role;
      } else {
        id = generateId('role');
        s.roles.push({
          id,
          slug: input.slug,
          name: input.name ?? input.nameAr,
          nameAr: input.nameAr,
          permissions: input.permissions,
        });
      }
    });
    return load().roles.find((r) => r.id === id)!;
  },

  async markNotificationRead(id: string) {
    mutate((s) => {
      const n = s.notifications.find((x) => x.id === id);
      if (n) n.read = true;
    });
  },
  async saveSettings(input: Partial<CompanySettings>) {
    mutate((s) => {
      s.settings = { ...s.settings, ...input };
    });
    return load().settings;
  },

  async getDashboardStats() {
    const s = load();
    const today = new Date().toISOString().slice(0, 10);
    return {
      todayOrders: s.orders.filter((o) => o.createdAt.startsWith(today)).length,
      pendingOrders: s.orders.filter((o) => ['submitted', 'under_review'].includes(o.status)).length,
      approvedOrders: s.orders.filter((o) => o.status === 'approved').length,
      factoryOrders: s.orders.filter((o) =>
        ['sent_to_factory', 'in_production', 'ready'].includes(o.status)
      ).length,
      completedOrders: s.orders.filter((o) => o.status === 'completed').length,
      revenue: s.orders
        .filter((o) => !['rejected', 'cancelled'].includes(o.status))
        .reduce((sum, o) => sum + (o.finalPrice ?? o.estimatedPrice), 0),
      customers: s.customers.length,
      products: s.products.length,
      inventoryAlerts: s.inventory.filter((i) => i.quantity <= i.reorderLevel).length,
      productionActive: s.orders.filter((o) =>
        ['sent_to_factory', 'in_production'].includes(o.status)
      ).length,
    };
  },

  async listProductionOrders() {
    return load().productionOrders;
  },

  async updateProductionStatus(id: string, status: OrderStatus, notes?: string) {
    const now = new Date().toISOString();
    mutate((s) => {
      const po = s.productionOrders.find((p) => p.id === id);
      if (!po) throw new Error('أمر الإنتاج غير موجود');
      po.status = status;
      po.updatedAt = now;
      if (notes) po.notes = notes;
      if (status === 'in_production' && !po.startedAt) po.startedAt = now;
      if (status === 'ready') po.readyAt = now;
      const order = s.orders.find((o) => o.id === po.orderId);
      if (order) {
        order.status = status;
        order.updatedAt = now;
      }
    });
    return load().productionOrders.find((p) => p.id === id)!;
  },

  async listInventory() {
    return load().inventory;
  },

  async listInventoryTransactions() {
    return load().inventoryTransactions;
  },

  async adjustInventory(id: string, quantity: number, note?: string) {
    const now = new Date().toISOString();
    mutate((s) => {
      const item = s.inventory.find((i) => i.id === id);
      if (!item) throw new Error('الصنف غير موجود');
      const delta = quantity - item.quantity;
      item.quantity = quantity;
      item.updatedAt = now;
      s.inventoryTransactions.unshift({
        id: generateId('txn'),
        inventoryId: id,
        type: delta >= 0 ? 'in' : 'out',
        quantity: Math.abs(delta),
        note: note ?? 'تعديل يدوي',
        createdAt: now,
      });
    });
    return load().inventory.find((i) => i.id === id)!;
  },

  async confirmMaterialConsumption(orderNumber: string, deductions: { inventoryId: string; quantity: number }[]) {
    const now = new Date().toISOString();
    mutate((s) => {
      deductions.forEach((d) => {
        const item = s.inventory.find((i) => i.id === d.inventoryId);
        if (!item) return;
        item.quantity = Math.max(0, item.quantity - d.quantity);
        item.updatedAt = now;
        s.inventoryTransactions.unshift({
          id: generateId('txn'),
          inventoryId: d.inventoryId,
          type: 'out',
          quantity: d.quantity,
          reference: orderNumber,
          note: 'استهلاك مواد إنتاج',
          createdAt: now,
        });
      });
    });
    return load().inventory;
  },
};
