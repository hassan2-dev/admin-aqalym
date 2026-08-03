import { ORDER_STATUS_LABELS } from '@/domain/enums';
import type { OrderStatus } from '@/domain/enums';
import { Badge } from '@/presentation/components/ui/badge';

const variantMap: Record<OrderStatus, 'default' | 'secondary' | 'accent' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  submitted: 'outline',
  under_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
  sent_to_factory: 'secondary',
  in_production: 'accent',
  ready: 'success',
  installation: 'warning',
  completed: 'success',
  cancelled: 'destructive',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={variantMap[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
