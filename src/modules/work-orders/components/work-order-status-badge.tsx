import { Badge } from '@/components/ui/badge';
import {
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderStatus,
} from '../schema/work-order.schema';

const STATUS_VARIANT: Record<
  WorkOrderStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'secondary',
  scheduled: 'outline',
  in_progress: 'default',
  completed: 'default',
  cancelled: 'destructive',
};

type Props = {
  status: WorkOrderStatus | string;
};

export function WorkOrderStatusBadge({ status }: Props) {
  const key = status as WorkOrderStatus;
  const label = WORK_ORDER_STATUS_LABELS[key] ?? status;
  const variant = STATUS_VARIANT[key] ?? 'secondary';

  return <Badge variant={variant}>{label}</Badge>;
}
