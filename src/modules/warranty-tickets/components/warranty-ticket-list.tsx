'use client';

import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ModuleListError } from '@/components/ui/module-list-error';
import { Button } from '@/components/ui/button';
import { stopCardNavigation, TappableListCard } from '@/components/ui/tappable-list-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ALL_STATUS_FILTER } from '@/lib/filters/status-filter';
import type { WarrantyTicketRow } from '../lib/warranty-ticket.queries';
import {
  WARRANTY_TICKET_PRIORITIES,
  WARRANTY_TICKET_PRIORITY_LABELS,
  WARRANTY_TICKET_STATUS_LABELS,
  type WarrantyTicketPriority,
  type WarrantyTicketStatus,
} from '../schema/warranty-ticket.schema';
import { normalizeWarrantyTicketFilters, useWarrantyTickets } from '../hooks/use-warranty-tickets';
import { WarrantyTicketPriorityBadge } from './warranty-ticket-priority-badge';
import { WarrantyTicketStatusBadge } from './warranty-ticket-status-badge';

const LIST_STATUS_FILTER = [
  'open',
  'assigned',
  'in_progress',
  'resolved',
] as const satisfies readonly WarrantyTicketStatus[];

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  canWrite?: boolean;
  initialData?: WarrantyTicketRow[];
  initialError?: string | null;
};

export function WarrantyTicketList({
  canWrite = false,
  initialData,
  initialError = null,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<WarrantyTicketStatus | typeof ALL_STATUS_FILTER>(
    ALL_STATUS_FILTER,
  );
  const [priorityFilter, setPriorityFilter] = useState<
    WarrantyTicketPriority | typeof ALL_STATUS_FILTER
  >(ALL_STATUS_FILTER);

  const filters = useMemo(
    () =>
      normalizeWarrantyTicketFilters({
        status: statusFilter === ALL_STATUS_FILTER ? undefined : statusFilter,
        priority: priorityFilter === ALL_STATUS_FILTER ? undefined : priorityFilter,
      }),
    [statusFilter, priorityFilter],
  );

  const hasInitial =
    statusFilter === ALL_STATUS_FILTER &&
    priorityFilter === ALL_STATUS_FILTER &&
    initialData !== undefined &&
    !initialError;

  const {
    data: tickets,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useWarrantyTickets(filters, { initialData: hasInitial ? initialData : undefined });

  const showSkeleton = isPending && !tickets;
  const showError = !tickets && (Boolean(initialError) || isError);
  const errorMessage =
    initialError ??
    (error instanceof Error
      ? error.message
      : 'Không thể tải yêu cầu bảo hành/CSKH. Vui lòng thử lại.');
  const hasActiveFilter =
    statusFilter !== ALL_STATUS_FILTER || priorityFilter !== ALL_STATUS_FILTER;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(
              (v ?? ALL_STATUS_FILTER) as WarrantyTicketStatus | typeof ALL_STATUS_FILTER,
            )
          }
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value && value !== ALL_STATUS_FILTER
                  ? WARRANTY_TICKET_STATUS_LABELS[value as WarrantyTicketStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_FILTER}>Tất cả trạng thái</SelectItem>
            {LIST_STATUS_FILTER.map((s) => (
              <SelectItem key={s} value={s}>
                {WARRANTY_TICKET_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) =>
            setPriorityFilter(
              (v ?? ALL_STATUS_FILTER) as WarrantyTicketPriority | typeof ALL_STATUS_FILTER,
            )
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Mức ưu tiên">
              {(value) =>
                value && value !== ALL_STATUS_FILTER
                  ? WARRANTY_TICKET_PRIORITY_LABELS[value as WarrantyTicketPriority]
                  : 'Mức ưu tiên'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_FILTER}>Tất cả mức ưu tiên</SelectItem>
            {WARRANTY_TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {WARRANTY_TICKET_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canWrite && (
          <Button
            size="sm"
            className="ml-auto"
            nativeButton={false}
            render={<Link href="/warranty/new" />}
          >
            <PlusIcon className="size-4" />
            Tạo yêu cầu
          </Button>
        )}
      </div>

      {isFetching && tickets && tickets.length > 0 && (
        <p className="text-xs text-muted-foreground">Đang cập nhật danh sách...</p>
      )}

      {showError && (
        <ModuleListError
          message={errorMessage}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      )}

      {showSkeleton && !showError && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!showSkeleton && !showError && tickets?.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {hasActiveFilter
              ? 'Không có yêu cầu phù hợp bộ lọc'
              : 'Chưa có yêu cầu bảo hành/CSKH'}
          </p>
          {!hasActiveFilter && (
            <p className="mt-2">Yêu cầu được tạo sau bàn giao hoặc từ CSKH trực tiếp.</p>
          )}
        </div>
      )}

      {!showSkeleton &&
        !showError &&
        tickets?.map((ticket) => (
          <TappableListCard
            key={ticket.id}
            href={`/warranty/${ticket.id}`}
            ariaLabel={`Xem yêu cầu ${ticket.code}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {ticket.code}
                  </span>
                  <WarrantyTicketStatusBadge status={ticket.status} />
                  <WarrantyTicketPriorityBadge priority={ticket.priority} />
                </div>
                <p className="mt-1 truncate text-sm font-medium">{ticket.issueTitle}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ticket.customer?.fullName ?? '—'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={`/warranty/${ticket.id}`} />}
                onClick={stopCardNavigation}
              >
                Xem
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Tiếp nhận: {formatDate(ticket.reportedAt)}</span>
              {ticket.assignedUser && <span>Phụ trách: {ticket.assignedUser.name}</span>}
              {ticket.handover && (
                <span>
                  Bàn giao:{' '}
                  <span className="font-mono text-foreground">{ticket.handover.code}</span>
                </span>
              )}
            </div>
          </TappableListCard>
        ))}
    </div>
  );
}
