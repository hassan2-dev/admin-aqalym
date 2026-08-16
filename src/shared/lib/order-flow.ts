import type { Order } from '@/domain/entities';
import type { OrderStatus } from '@/domain/enums';

export function isOrderPriced(order: Pick<Order, 'finalPrice'>): boolean {
  return typeof order.finalPrice === 'number' && order.finalPrice > 0;
}

export function canStartReview(order: Pick<Order, 'status'>): boolean {
  return order.status === 'submitted';
}

export function canPriceOrder(order: Pick<Order, 'status'>): boolean {
  return ['under_review', 'approved'].includes(order.status);
}

export function canApproveOrder(order: Pick<Order, 'status' | 'finalPrice'>): boolean {
  return order.status === 'under_review' && isOrderPriced(order);
}

export function canSendToFactory(order: Pick<Order, 'status' | 'finalPrice'>): boolean {
  return order.status === 'approved' && isOrderPriced(order);
}

export function assertCanApprove(order: Pick<Order, 'status' | 'finalPrice'>): void {
  if (order.status === 'submitted') {
    throw new Error('ابدأ المراجعة أولاً، بعدين التسعير، وبعدين الاعتماد');
  }
  if (order.status !== 'under_review') {
    throw new Error('الاعتماد يكون بعد المراجعة والتسعير');
  }
  if (!isOrderPriced(order)) {
    throw new Error('ما يصير الاعتماد بدون تسعير. سعّر الطلب أولاً');
  }
}

export type SalesStageId =
  | 'review'
  | 'pricing'
  | 'approval'
  | 'ready_factory'
  | 'factory'
  | 'done';

export function salesStage(order: Pick<Order, 'status' | 'finalPrice'>): SalesStageId {
  if (['rejected', 'cancelled'].includes(order.status)) return 'done';
  if (['completed', 'installation', 'ready'].includes(order.status)) return 'done';
  if (['sent_to_factory', 'in_production'].includes(order.status)) return 'factory';
  if (order.status === 'approved') return 'ready_factory';
  if (order.status === 'under_review' && isOrderPriced(order)) return 'approval';
  if (order.status === 'under_review') return 'pricing';
  return 'review';
}

export const SALES_STAGE_LABELS: Record<SalesStageId, string> = {
  review: 'قيد المراجعة',
  pricing: 'تسعير',
  approval: 'اعتماد',
  ready_factory: 'معتمد — جاهز للمصنع',
  factory: 'في المصنع',
  done: 'مكتمل / تسليم',
};

export const SALES_PIPELINE: { id: SalesStageId | 'all'; label: string; statuses?: OrderStatus[] }[] =
  [
    { id: 'all', label: 'الكل' },
    { id: 'review', label: 'مراجعة' },
    { id: 'pricing', label: 'تسعير' },
    { id: 'approval', label: 'اعتماد' },
    { id: 'ready_factory', label: 'جاهز للمصنع' },
    { id: 'factory', label: 'المصنع' },
    { id: 'done', label: 'مكتمل' },
  ];

export const ORDER_PROGRESS_STEPS = [
  { id: 'review', label: 'مراجعة' },
  { id: 'pricing', label: 'تسعير' },
  { id: 'approval', label: 'اعتماد' },
  { id: 'factory', label: 'المصنع' },
  { id: 'done', label: 'جاهز / تسليم' },
] as const;

/** الخطوة الحالية في الشريط: مراجعة → تسعير → اعتماد → مصنع → تسليم */
export function orderProgressIndex(order: Pick<Order, 'status' | 'finalPrice'>): number {
  if (order.status === 'rejected' || order.status === 'cancelled') return -1;
  if (['completed', 'installation', 'ready'].includes(order.status)) return 4;
  if (['sent_to_factory', 'in_production'].includes(order.status)) return 3;
  if (order.status === 'approved') return 3;
  if (order.status === 'under_review' && isOrderPriced(order)) return 2;
  if (order.status === 'under_review') return 1;
  return 0;
}
