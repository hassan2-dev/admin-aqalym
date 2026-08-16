import type {
  CategorySlug,
  InventoryTxnType,
  MeasurementKey,
  NotificationChannel,
  OfferingType,
  OrderKind,
  OrderStatus,
  Permission,
  PricingMode,
  ProductKind,
  RoleSlug,
  StaffStatus,
} from '@/domain/enums';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductColor {
  id: string;
  name: string;
  nameAr: string;
  hex: string;
}

export interface Measurements {
  width: number;
  height: number;
  quantity: number;
}

export interface OrderLocation {
  governorate: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  at: string;
  by?: string;
  note?: string;
}

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  image: string;
  order: number;
}

/** Global reusable specification template managed by admin. */
export interface SpecCatalog {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  specifications: ProductSpec[];
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementField {
  key: MeasurementKey;
  enabled: boolean;
  required: boolean;
  min: number;
  max: number;
  unit: string;
}

export interface OfferingOptionValue {
  id: string;
  nameAr: string;
  priceDelta?: number;
  hex?: string;
}

export interface OfferingOptionGroup {
  id: string;
  nameAr: string;
  required: boolean;
  multi?: boolean;
  values: OfferingOptionValue[];
}

/** Unified orderable item — product or service, same engine. */
export interface Product {
  id: string;
  categoryId: string;
  categorySlug: CategorySlug;
  /** Derived: custom if requiresMeasurements, else ready. */
  kind: ProductKind;
  offeringType?: OfferingType;
  published?: boolean;
  sortOrder?: number;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  images: string[];
  minimumWidth: number;
  maximumWidth: number;
  minimumHeight: number;
  maximumHeight: number;
  estimatedPrice: number;
  pricingMode?: PricingMode;
  requiresMeasurements?: boolean;
  measurementFields?: MeasurementField[];
  requiresLocation?: boolean;
  catalogId: string | null;
  extraSpecifications: ProductSpec[];
  specifications: ProductSpec[];
  optionGroups?: OfferingOptionGroup[];
  addonIds?: string[];
  variants: string[];
  glassTypes: string[];
  accessories: string[];
  colors: ProductColor[];
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Variant {
  id: string;
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  images: string[];
  specifications: ProductSpec[];
  minimumWidth?: number;
  maximumWidth?: number;
  minimumHeight?: number;
  maximumHeight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlassType {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  thickness?: number;
  color?: string;
  pricePerSqm: number;
  image?: string;
}

export interface Accessory {
  id: string;
  category?: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  image?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  governorate: string;
  city: string;
  address: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  governorate?: string;
  city?: string;
  addresses: CustomerAddress[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  categoryId: string;
  categoryName: string;
  width: number;
  height: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  orderKind: OrderKind;
  categoryId: string;
  categorySlug: CategorySlug;
  categoryName: string;
  productId: string;
  productName: string;
  productImage?: string;
  measurements: Measurements;
  selectedVariant?: string;
  selectedGlass?: string;
  selectedAccessories: string[];
  selectedColor?: string;
  location: OrderLocation;
  estimatedPrice: number;
  finalPrice?: number;
  /** بنود الطلب — كل بند بسعره؛ الإجمالي = مجموع lineTotal */
  lineItems?: OrderLineItem[];
  status: OrderStatus;
  notes?: string;
  images?: string[];
  timeline: OrderTimelineEvent[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionMaterial {
  inventoryId: string;
  nameAr: string;
  sku: string;
  unit: string;
  quantity: number;
}

export interface ProductionOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  startedAt?: string;
  readyAt?: string;
  notes?: string;
  materials?: ProductionMaterial[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  nameAr: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryId: string;
  type: InventoryTxnType;
  quantity: number;
  reference?: string;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Project {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  governorate: string;
  images: string[];
  videos: string[];
  completionDate: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  userId?: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export interface OtpLog {
  id: string;
  phone: string;
  purpose: string;
  success: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  slug: RoleSlug;
  name: string;
  nameAr: string;
  permissions: Permission[];
  isSystem?: boolean;
}

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  roleId: string;
  roleSlug: RoleSlug;
  status: StaffStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  companyName: string;
  companyNameAr: string;
  phone: string;
  email: string;
  address: string;
  governorate: string;
  logoUrl?: string;
  taxNumber?: string;
  otpEnabled: boolean;
  otpLength: number;
  otpExpiryMinutes: number;
  storageFolder: string;
  fcmEnabled: boolean;
  currency: string;
  timezone: string;
}

export interface DashboardStats {
  todayOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  factoryOrders: number;
  completedOrders: number;
  revenue: number;
  customers: number;
  products: number;
}
