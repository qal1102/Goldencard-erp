import { Badge } from '@/components/ui/badge';
import {
  HANDOVER_STATUS_LABELS,
  type HandoverStatus,
} from '../schema/handover.schema';

const STATUS_VARIANT: Record<
  HandoverStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'secondary',
  pending_customer: 'outline',
  completed: 'default',
  cancelled: 'destructive',
};

type Props = {
  status: string;
  className?: string;
};

export function HandoverStatusBadge({ status, className }: Props) {
  const key = status as HandoverStatus;
  const label = HANDOVER_STATUS_LABELS[key] ?? status;
  const variant = STATUS_VARIANT[key] ?? 'secondary';

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
