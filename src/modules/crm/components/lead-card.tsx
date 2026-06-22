import { TappableListCard } from '@/components/ui/tappable-list-card';
import type { Lead } from '@/db/schema';
import type { ProjectProgressView } from '@/lib/project-progress/types';
import { cn } from '@/lib/utils';
import { getLeadSalesProgress } from '../lib/lead-sales-progress';
import type { LeadSource } from '../schema/lead.schema';
import { LeadProgressSummary } from './lead-progress-summary';
import { LeadSourceBadge } from './lead-source-badge';

type LeadWithUser = Lead & {
  assignedUser: { id: string; name: string } | null;
};

type Props = {
  lead: LeadWithUser;
  progress?: ProjectProgressView | null;
  className?: string;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function LeadCard({ lead, progress, className }: Props) {
  const salesProgress = getLeadSalesProgress(lead);

  return (
    <TappableListCard
      href={`/crm/leads/${lead.id}`}
      ariaLabel={`Xem cơ hội ${lead.fullName}`}
      className={cn('hover:shadow-md active:scale-[0.99]', className)}
      contentClassName="p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{lead.fullName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{lead.phone}</p>
        </div>
        <LeadSourceBadge source={lead.source as LeadSource} />
      </div>

      {lead.expectedCapacity && (
        <p className="mt-1.5 text-xs text-muted-foreground">{lead.expectedCapacity}</p>
      )}

      <div
        className={cn(
          'mt-2 rounded-md border px-2 py-1.5 text-xs',
          salesProgress.isFollowUpOverdue
            ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'
            : 'bg-muted/50 text-muted-foreground',
        )}
      >
        <p className="font-medium">{salesProgress.nextAction}</p>
        <p className="mt-0.5">
          Liên hệ: {salesProgress.lastContactLabel} · {salesProgress.callResultLabel}
        </p>
        {lead.followUpAt && <p className="mt-0.5">Hẹn lại: {salesProgress.followUpLabel}</p>}
      </div>

      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
        {lead.assignedUser && (
          <span className="max-w-[100px] truncate text-xs text-muted-foreground">
            {lead.assignedUser.name}
          </span>
        )}
      </div>

      <p className="mt-1 text-[10px] font-mono text-muted-foreground/60">{lead.code}</p>

      {progress && <LeadProgressSummary progress={progress} />}
    </TappableListCard>
  );
}
