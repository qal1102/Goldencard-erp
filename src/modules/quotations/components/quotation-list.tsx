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
import type { QuotationRow } from '../lib/quotation.queries';
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUSES,
  type QuotationStatus,
} from '../schema/quotation.schema';
import { normalizeQuotationFilters, useQuotations } from '../hooks/use-quotations';
import { QuotationStatusBadge } from './quotation-status-badge';

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

type Props = {
  initialData?: QuotationRow[];
  initialError?: string | null;
};

export function QuotationList({ initialData, initialError = null }: Props) {
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | typeof ALL_STATUS_FILTER>(
    ALL_STATUS_FILTER,
  );

  const filters = useMemo(
    () =>
      normalizeQuotationFilters({
        status: statusFilter === ALL_STATUS_FILTER ? undefined : statusFilter,
      }),
    [statusFilter],
  );

  const hasInitial = statusFilter === ALL_STATUS_FILTER && initialData !== undefined && !initialError;

  const {
    data: quotationList,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuotations(filters, { initialData: hasInitial ? initialData : undefined });

  const showSkeleton = isPending && !quotationList;
  const showError = !quotationList && (Boolean(initialError) || isError);
  const errorMessage =
    initialError ??
    (error instanceof Error
      ? error.message
      : 'Không thể tải danh sách báo giá. Vui lòng thử lại.');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter((v ?? ALL_STATUS_FILTER) as QuotationStatus | typeof ALL_STATUS_FILTER)
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value && value !== ALL_STATUS_FILTER
                  ? QUOTATION_STATUS_LABELS[value as QuotationStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_FILTER}>Tất cả trạng thái</SelectItem>
            {QUOTATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {QUOTATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFetching && quotationList && quotationList.length > 0 && (
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
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!showSkeleton && !showError && quotationList?.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {statusFilter !== ALL_STATUS_FILTER
            ? 'Không có báo giá nào ở trạng thái này'
            : 'Chưa có báo giá nào'}
        </div>
      )}

      {!showSkeleton &&
        !showError &&
        quotationList?.map((q) => (
          <TappableListCard
            key={q.id}
            href={`/quotations/${q.id}`}
            ariaLabel={`Xem báo giá ${q.code}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{q.code}</span>
                  <QuotationStatusBadge status={q.status as QuotationStatus} />
                </div>
                <p className="truncate text-sm font-medium">{q.customerNameSnapshot}</p>
                <p className="text-xs text-muted-foreground">
                  Khảo sát: <span className="font-mono">{q.survey?.code ?? '—'}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(q.grandTotal)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/quotations/${q.id}`} />}
                  onClick={stopCardNavigation}
                >
                  Xem
                </Button>
              </div>
            </div>
          </TappableListCard>
        ))}
    </div>
  );
}
