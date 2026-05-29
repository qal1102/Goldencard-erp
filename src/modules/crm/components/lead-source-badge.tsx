import { cn } from '@/lib/utils';
import { LEAD_SOURCE_LABELS, type LeadSource } from '../schema/lead.schema';

const SOURCE_STYLES: Record<LeadSource, string> = {
  zalo: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  facebook: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  referral: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  website: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  direct: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

type Props = {
  source: LeadSource;
  className?: string;
};

export function LeadSourceBadge({ source, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        SOURCE_STYLES[source] ?? SOURCE_STYLES.other,
        className,
      )}
    >
      {LEAD_SOURCE_LABELS[source] ?? source}
    </span>
  );
}
