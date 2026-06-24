'use client';

import { useSearchParams } from 'next/navigation';
import { ModuleListError } from '@/components/ui/module-list-error';
import { Skeleton } from '@/components/ui/skeleton';
import type { Lead } from '@/db/schema';
import { useLeads } from '../hooks/use-leads';
import { useProjectProgressForLeads } from '../hooks/use-project-progress';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_SALES_FILTERS,
  type LeadSalesFilter,
  type LeadStatus,
} from '../schema/lead.schema';
import { LeadCard } from './lead-card';

const MAX_PROGRESS_BATCH_SIZE = 120;

type LeadWithUser = Lead & {
  assignedUser: { id: string; name: string } | null;
  createdByUser: { id: string; name: string };
};

const STATUS_COLUMN_COLORS: Record<LeadStatus, string> = {
  new: 'bg-slate-50 dark:bg-slate-900/30',
  contacting: 'bg-blue-50 dark:bg-blue-950/20',
  consulting: 'bg-indigo-50 dark:bg-indigo-950/20',
  awaiting_survey: 'bg-amber-50 dark:bg-amber-950/20',
  quoted: 'bg-purple-50 dark:bg-purple-950/20',
  negotiating: 'bg-orange-50 dark:bg-orange-950/20',
  won: 'bg-green-50 dark:bg-green-950/20',
  lost: 'bg-red-50 dark:bg-red-950/20',
};

function PipelineColumnSkeleton() {
  return (
    <div className="w-[280px] flex-shrink-0 snap-start">
      <div className="rounded-xl bg-muted/50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-6 rounded-full" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="mb-2 h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function LeadPipeline() {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? undefined;
  const statusFilter = searchParams.get('status') as LeadStatus | null;
  const salesFilterParam = searchParams.get('salesFilter');
  const salesFilter = LEAD_SALES_FILTERS.includes(salesFilterParam as LeadSalesFilter)
    ? (salesFilterParam as LeadSalesFilter)
    : null;
  const view = searchParams.get('view') === 'list' ? 'list' : 'pipeline';

  const {
    data: leads,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useLeads({
    search,
    status: statusFilter ?? undefined,
    salesFilter: salesFilter ?? undefined,
  });

  const showSkeleton = isPending && !leads;
  const showError = !leads && isError;
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Không thể tải danh sách cơ hội. Vui lòng thử lại.';

  const leadIds = (leads ?? []).slice(0, MAX_PROGRESS_BATCH_SIZE).map((l) => l.id);
  const { data: progressByLeadId } = useProjectProgressForLeads(leadIds);

  if (showError) {
    return (
      <ModuleListError
        message={errorMessage}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  if (showSkeleton) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {LEAD_STATUSES.slice(0, 4).map((s) => (
          <PipelineColumnSkeleton key={s} />
        ))}
      </div>
    );
  }

  const leadsTyped = leads as LeadWithUser[];

  if (view === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {leadsTyped.length === 0 && (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Không có cơ hội phù hợp.
          </p>
        )}
        {leadsTyped.map((lead) => (
          <LeadCard key={lead.id} lead={lead} progress={progressByLeadId?.[lead.id]} />
        ))}
      </div>
    );
  }

  const visibleStatuses = statusFilter ? [statusFilter] : LEAD_STATUSES;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground sm:hidden">
        <span>Vuốt ngang để xem thêm trạng thái</span>
        <span aria-hidden="true">→</span>
      </div>
      <div className="-mx-4 overflow-x-auto pb-4 sm:mx-0">
      <div className="flex gap-3 px-4 sm:px-0" style={{ minWidth: 'max-content' }}>
        {visibleStatuses.map((status) => {
          const statusLeads = leadsTyped.filter((l) => l.status === status);
          return (
            <div key={status} className="w-[280px] flex-shrink-0 snap-start">
              <div
                className={`rounded-xl p-3 ring-1 ring-foreground/5 ${STATUS_COLUMN_COLORS[status]}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{LEAD_STATUS_LABELS[status]}</span>
                  <span className="flex size-5 items-center justify-center rounded-full bg-background text-xs font-medium ring-1 ring-foreground/10">
                    {statusLeads.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {statusLeads.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Trống</p>
                  )}
                  {statusLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      progress={progressByLeadId?.[lead.id]}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
      <div className="pointer-events-none absolute top-6 right-0 bottom-4 w-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
    </div>
  );
}
