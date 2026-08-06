'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderStatus } from '@/domain/enums';
import { dataService } from '@/infrastructure/repositories/data-service';
import { subscribeDemo } from '@/infrastructure/demo/store';
import { useEffect } from 'react';

function useDemoInvalidate() {
  const qc = useQueryClient();
  useEffect(() => {
    return subscribeDemo(() => {
      qc.invalidateQueries();
    });
  }, [qc]);
}

export function useDashboardStats() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['dashboard-stats'], queryFn: () => dataService.getDashboardStats() });
}

export function useOrders(filters?: { status?: OrderStatus; q?: string }) {
  useDemoInvalidate();
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => dataService.listOrders(filters),
  });
}

export function useOrder(id: string) {
  useDemoInvalidate();
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => dataService.getOrder(id),
    enabled: !!id,
  });
}

export function useOrderMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['orders'] });
    void qc.invalidateQueries({ queryKey: ['order'] });
    void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };
  return {
    updateStatus: useMutation({
      mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
        dataService.updateOrderStatus(id, status, note),
      onSuccess: invalidate,
    }),
    updatePrice: useMutation({
      mutationFn: ({ id, price }: { id: string; price: number }) => dataService.updateOrderPrice(id, price),
      onSuccess: invalidate,
    }),
    convert: useMutation({
      mutationFn: (id: string) => dataService.convertToProduction(id),
      onSuccess: invalidate,
    }),
  };
}

export function useProducts() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['products'], queryFn: () => dataService.listProducts() });
}

export function useCategories() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['categories'], queryFn: () => dataService.listCategories() });
}

export function useCatalogs() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['catalogs'], queryFn: () => dataService.listCatalogs() });
}

export function useVariants() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['variants'], queryFn: () => dataService.listVariants() });
}

export function useGlass() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['glass'], queryFn: () => dataService.listGlass() });
}

export function useAccessories() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['accessories'], queryFn: () => dataService.listAccessories() });
}

export function useServices() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['services'], queryFn: () => dataService.listServices() });
}

export function useCustomers() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['customers'], queryFn: () => dataService.listCustomers() });
}

export function useProjects() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['projects'], queryFn: () => dataService.listProjects() });
}

export function useStaff() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['staff'], queryFn: () => dataService.listStaff() });
}

export function useRoles() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['roles'], queryFn: () => dataService.listRoles() });
}

export function useNotifications() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['notifications'], queryFn: () => dataService.listNotifications() });
}

export function useOtpLogs() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['otp-logs'], queryFn: () => dataService.listOtpLogs() });
}

export function useSettings() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['settings'], queryFn: () => dataService.getSettings() });
}

export function useProductionOrders() {
  useDemoInvalidate();
  return useQuery({
    queryKey: ['production-orders'],
    queryFn: () => dataService.listProductionOrders(),
  });
}

export function useInventory() {
  useDemoInvalidate();
  return useQuery({ queryKey: ['inventory'], queryFn: () => dataService.listInventory() });
}

export function useInventoryTransactions() {
  useDemoInvalidate();
  return useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: () => dataService.listInventoryTransactions(),
  });
}

export function useFactoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['production-orders'] });
    void qc.invalidateQueries({ queryKey: ['orders'] });
    void qc.invalidateQueries({ queryKey: ['order'] });
    void qc.invalidateQueries({ queryKey: ['inventory'] });
    void qc.invalidateQueries({ queryKey: ['inventory-transactions'] });
    void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };
  return {
    updateProductionStatus: useMutation({
      mutationFn: ({
        id,
        status,
        notes,
      }: {
        id: string;
        status: OrderStatus;
        notes?: string;
      }) => dataService.updateProductionStatus(id, status, notes),
      onSuccess: invalidate,
    }),
    confirmConsumption: useMutation({
      mutationFn: ({
        orderNumber,
        deductions,
      }: {
        orderNumber: string;
        deductions: { inventoryId: string; quantity: number }[];
      }) => dataService.confirmMaterialConsumption(orderNumber, deductions),
      onSuccess: invalidate,
    }),
    adjustInventory: useMutation({
      mutationFn: ({ id, quantity, note }: { id: string; quantity: number; note?: string }) =>
        dataService.adjustInventory(id, quantity, note),
      onSuccess: invalidate,
    }),
  };
}

export function useCrudMutation<TArgs, TResult>(
  key: string[],
  fn: (args: TArgs) => Promise<TResult>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
