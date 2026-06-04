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
import type { WorkOrderRow } from '../lib/work-order.queries';
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  type WorkOrderStatus,
} from '../schema/work-order.schema';
import { normalizeWorkOrderFilters, useWorkOrders } from '../hooks/use-work-orders';
import { WorkOrderStatusBadge } from './work-order-status-badge';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  isTechnician?: boolean;
  initialData?: WorkOrderRow[];
  initialError?: string | null;
};

export function WorkOrderList({
  isTechnician = false,
  initialData,
  initialError = null,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | typeof ALL_STATUS_FILTER>(
    ALL_STATUS_FILTER,
  );

  const filters = useMemo(
    () =>
      normalizeWorkOrderFilters({
        status: statusFilter === ALL_STATUS_FILTER ? undefined : statusFilter,
      }),
    [statusFilter],
  );

  const hasInitial = statusFilter === ALL_STATUS_FILTER && initialData !== undefined && !initialError;

  const {
    data: workOrderList,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useWorkOrders(filters, { initialData: hasInitial ? initialData : undefined });

  const showSkeleton = isPending && !workOrderList;
  const showError = !workOrderList && (Boolean(initialError) || isError);
  const errorMessage =
    initialError ??
    (error instanceof Error ? error.message : 'Không thể tải danh sách lệnh thi công. Vui lòng thử lại.');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v ?? ALL_STATUS_FILTER) as WorkOrderStatus | typeof ALL_STATUS_FILTER)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value && value !== ALL_STATUS_FILTER
                  ? WORK_ORDER_STATUS_LABELS[value as WorkOrderStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_FILTER}>Tất cả trạng thái</SelectItem>
            {WORK_ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {WORK_ORDER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isTechnician && (
        <p className="text-xs text-muted-foreground">
          Danh sách lệnh thi công được phân công cho bạn
        </p>
      )}

      {isFetching && workOrderList && workOrderList.length > 0 && (
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

      {!showSkeleton && !showError && workOrderList?.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Chưa có lệnh thi công</p>
          <p className="mt-2">
            Lệnh thi công được tạo từ hợp đồng đã ký trong quy trình báo giá và thi công.
          </p>
        </div>
      )}

      {!showSkeleton &&
        !showError &&
        workOrderList?.map((wo) => (
          <TappableListCard
            key={wo.id}
            href={`/work-orders/${wo.id}`}
            ariaLabel={`Xem lệnh thi công ${wo.code}`}
            contentClassName="flex flex-col gap-2 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{wo.code}</span>
                  <WorkOrderStatusBadge status={wo.status} />
                </div>
                {wo.customer && (
                  <p className="mt-1 truncate text-sm">{wo.customer.fullName}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/work-orders/${wo.id}`} />}
                onClick={stopCardNavigation}
              >
                Xem
              </Button>
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground">
              {wo.contract && (
                <p>
                  Hợp đồng:{' '}
                  <span className="font-mono text-foreground">{wo.contract.code}</span>
                </p>
              )}
              {wo.assignedUser && <p>Kỹ thuật: {wo.assignedUser.name}</p>}
              <p>
                Lịch thi công:{' '}
                {wo.scheduledStartAt ? formatDate(wo.scheduledStartAt) : '—'}
                {wo.scheduledEndAt && ` → ${formatDate(wo.scheduledEndAt)}`}
              </p>
              {wo.installationAddress && (
                <p className="line-clamp-2">{wo.installationAddress}</p>
              )}
            </div>
          </TappableListCard>
        ))}
    </div>
  );
}
