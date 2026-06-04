import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  WARRANTY_TICKET_STATUS_LABELS,
  type WarrantyTicketStatus,
} from '../schema/warranty-ticket.schema';

type Props = {
  status: WarrantyTicketStatus | string;
  className?: string;
};

export function WarrantyTicketStatusBadge({ status, className }: Props) {
  const label =
    WARRANTY_TICKET_STATUS_LABELS[status as WarrantyTicketStatus] ?? status;

  const variant =
    status === 'resolved'
      ? 'secondary'
      : status === 'cancelled'
        ? 'outline'
        : status === 'in_progress'
          ? 'default'
          : 'secondary';

  return (
    <Badge variant={variant} className={cn('text-[10px]', className)}>
      {label}
    </Badge>
  );
}
