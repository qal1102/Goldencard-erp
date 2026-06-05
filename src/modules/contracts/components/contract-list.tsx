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
import type { ContractRow } from '../lib/contract.queries';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  type ContractStatus,
} from '../schema/contract.schema';
import { normalizeContractFilters, useContracts } from '../hooks/use-contracts';
import { ContractStatusBadge } from './contract-status-badge';

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  initialData?: ContractRow[];
  initialError?: string | null;
};

export function ContractList({ initialData, initialError = null }: Props) {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | typeof ALL_STATUS_FILTER>(
    ALL_STATUS_FILTER,
  );

  const filters = useMemo(
    () =>
      normalizeContractFilters({
        status: statusFilter === ALL_STATUS_FILTER ? undefined : statusFilter,
      }),
    [statusFilter],
  );

  const hasInitial = statusFilter === ALL_STATUS_FILTER && initialData !== undefined && !initialError;

  const {
    data: contractList,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useContracts(filters, { initialData: hasInitial ? initialData : undefined });

  const showSkeleton = isPending && !contractList;
  const showError = !contractList && (Boolean(initialError) || isError);
  const errorMessage =
    initialError ??
    (error instanceof Error
      ? error.message
      : 'Không thể tải danh sách hợp đồng. Vui lòng thử lại.');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter((v ?? ALL_STATUS_FILTER) as ContractStatus | typeof ALL_STATUS_FILTER)
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value && value !== ALL_STATUS_FILTER
                  ? CONTRACT_STATUS_LABELS[value as ContractStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_FILTER}>Tất cả trạng thái</SelectItem>
            {CONTRACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CONTRACT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFetching && contractList && contractList.length > 0 && (
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

      {!showSkeleton && !showError && contractList?.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {statusFilter !== ALL_STATUS_FILTER
            ? 'Không có hợp đồng nào ở trạng thái này'
            : 'Chưa có hợp đồng nào'}
        </div>
      )}

      {!showSkeleton &&
        !showError &&
        contractList?.map((c) => (
          <TappableListCard
            key={c.id}
            href={`/contracts/${c.id}`}
            ariaLabel={`Xem hợp đồng ${c.code}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{c.code}</span>
                  <ContractStatusBadge status={c.status} />
                </div>
                <p className="truncate text-sm font-medium">{c.customer?.fullName ?? '—'}</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(c.contractValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.quotation ? (
                    <>
                      Tạo từ báo giá <span className="font-mono">{c.quotation.code}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
                {c.status === 'signed' && c.signedAt && (
                  <p className="text-xs text-muted-foreground">
                    Ngày ký: {formatDate(c.signedAt)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/contracts/${c.id}`}>Xem</Link>}
                onClick={stopCardNavigation}
              />
            </div>
          </TappableListCard>
        ))}
    </div>
  );
}
