import { cn } from '@/lib/utils';
import { LEAD_STATUS_LABELS, type LeadStatus } from '../schema/lead.schema';

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  contacting: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  consulting: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  awaiting_survey: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  quoted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  negotiating: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  won: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  lost: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};

type Props = {
  status: LeadStatus;
  className?: string;
};

export function LeadStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? STATUS_STYLES.new,
        className,
      )}
    >
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
}
