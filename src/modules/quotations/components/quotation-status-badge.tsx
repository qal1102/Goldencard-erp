import { cn } from '@/lib/utils';
import { QUOTATION_STATUS_LABELS, type QuotationStatus } from '../schema/quotation.schema';

const STATUS_STYLES: Record<QuotationStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  needs_revision: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  no_response: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

type Props = {
  status: QuotationStatus;
  className?: string;
};

export function QuotationStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
        className,
      )}
    >
      {QUOTATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
