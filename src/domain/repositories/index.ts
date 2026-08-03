import type { Order, Product, StaffUser } from '@/domain/entities';
import type { OrderStatus } from '@/domain/enums';

export interface IOrderRepository {
  list(filters?: { status?: OrderStatus; q?: string }): Promise<Order[]>;
  getById(id: string): Promise<Order>;
  updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order>;
  updatePrice(id: string, price: number): Promise<Order>;
  convertToProduction(id: string): Promise<Order>;
}

export interface IProductRepository {
  list(): Promise<Product[]>;
  save(input: Partial<Product> & Pick<Product, 'nameAr' | 'categoryId'>): Promise<Product>;
  delete(id: string): Promise<void>;
}

export interface IAuthRepository {
  login(email: string, password: string): Promise<StaffUser>;
  logout(): Promise<void>;
  currentUser(): Promise<StaffUser | null>;
}
