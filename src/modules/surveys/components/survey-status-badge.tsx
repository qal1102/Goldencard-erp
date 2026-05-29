import { cn } from '@/lib/utils';
import { SURVEY_STATUS_LABELS, type SurveyStatus } from '../schema/survey.schema';

const STATUS_STYLES: Record<SurveyStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

type Props = {
  status: SurveyStatus;
  className?: string;
};

export function SurveyStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? STATUS_STYLES.pending,
        className,
      )}
    >
      {SURVEY_STATUS_LABELS[status] ?? status}
    </span>
  );
}
