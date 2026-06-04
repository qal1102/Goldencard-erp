import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  WARRANTY_TICKET_PRIORITY_LABELS,
  type WarrantyTicketPriority,
} from '../schema/warranty-ticket.schema';

type Props = {
  priority: WarrantyTicketPriority | string;
  className?: string;
};

export function WarrantyTicketPriorityBadge({ priority, className }: Props) {
  const label =
    WARRANTY_TICKET_PRIORITY_LABELS[priority as WarrantyTicketPriority] ?? priority;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px]',
        priority === 'urgent' &&
          'border-destructive/50 bg-destructive/10 text-destructive',
        priority === 'important' &&
          'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        priority === 'normal' && 'text-muted-foreground',
        className,
      )}
    >
      {label}
    </Badge>
  );
}
