'use client';

import Link from 'next/link';
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
import type { HandoverRow } from '../lib/handover.queries';
import {
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUSES,
  type HandoverStatus,
} from '../schema/handover.schema';
import { normalizeHandoverFilters, useHandovers } from '../hooks/use-handovers';
import { HandoverStatusBadge } from './handover-status-badge';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  initialData?: HandoverRow[];
  initialError?: string | null;
};

export function HandoverList({ initialData, initialError = null }: Props) {
  const [statusFilter, setStatusFilter] = useState<HandoverStatus | typeof ALL_STATUS_FILTER>(
    ALL_STATUS_FILTER,
  );

  const filters = useMemo(
    () =>
      normalizeHandoverFilters({
        status: statusFilter === ALL_STATUS_FILTER ? undefined : statusFilter,
      }),
    [statusFilter],
  );

  const hasInitial = statusFilter === ALL_STATUS_FILTER && initialData !== undefined && !initialError;

  const {
    data: handoverList,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useHandovers(filters, { initialData: hasInitial ? initialData : undefined });

  const showSkeleton = isPending && !handoverList;
  const showError = !handoverList && (Boolean(initialError) || isError);
  const errorMessage =
    initialError ??
    (error instanceof Error ? error.message : 'Không thể tải danh sách bàn giao. Vui lòng thử lại.');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter((v ?? ALL_STATUS_FILTER) as HandoverStatus | typeof ALL_STATUS_FILTER)
          }
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value && value !== ALL_STATUS_FILTER
                  ? HANDOVER_STATUS_LABELS[value as HandoverStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_FILTER}>Tất cả trạng thái</SelectItem>
            {HANDOVER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {HANDOVER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFetching && handoverList && handoverList.length > 0 && (
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

      {!showSkeleton && !showError && handoverList?.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Chưa có hồ sơ bàn giao</p>
          <p className="mt-2">
            Phiếu bàn giao được tạo sau khi hoàn thành lệnh thi công.
          </p>
        </div>
      )}

      {!showSkeleton &&
        !showError &&
        handoverList?.map((handover) => (
          <TappableListCard
            key={handover.id}
            href={`/handovers/${handover.id}`}
            ariaLabel={`Xem phiếu bàn giao ${handover.code}`}
            contentClassName="flex flex-col gap-2 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{handover.code}</span>
                  <HandoverStatusBadge status={handover.status} />
                </div>
                {handover.customer && (
                  <p className="mt-1 truncate text-sm">{handover.customer.fullName}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/handovers/${handover.id}`} />}
                onClick={stopCardNavigation}
              >
                Xem
              </Button>
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground">
              {handover.workOrder && (
                <p>
                  Lệnh thi công:{' '}
                  <span className="font-mono text-foreground">{handover.workOrder.code}</span>
                </p>
              )}
              <p>Ngày bàn giao: {formatDate(handover.handoverAt)}</p>
            </div>
          </TappableListCard>
        ))}
    </div>
  );
}
