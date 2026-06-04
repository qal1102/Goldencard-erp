'use client';

import Link from 'next/link';
import { useState } from 'react';
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
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  type ContractStatus,
} from '../schema/contract.schema';
import { useContracts } from '../hooks/use-contracts';
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

export function ContractList() {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');

  const { data: contractList, isLoading } = useContracts({
    status: statusFilter || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ContractStatus | '')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value
                  ? CONTRACT_STATUS_LABELS[value as ContractStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả trạng thái</SelectItem>
            {CONTRACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CONTRACT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && (!contractList || contractList.length === 0) && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {statusFilter ? 'Không có hợp đồng nào ở trạng thái này' : 'Chưa có hợp đồng nào'}
        </div>
      )}

      {!isLoading && contractList && contractList.length > 0 && (
        <div className="flex flex-col gap-3">
          {contractList.map((c) => (
            <TappableListCard
              key={c.id}
              href={`/contracts/${c.id}`}
              ariaLabel={`Xem hợp đồng ${c.code}`}
            >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {c.code}
                      </span>
                      <ContractStatusBadge status={c.status} />
                    </div>
                    <p className="truncate text-sm font-medium">
                      {c.customer?.fullName ?? '—'}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(c.contractValue)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.quotation ? (
                        <>
                          Tạo từ báo giá{' '}
                          <span className="font-mono">{c.quotation.code}</span>
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
      )}
    </div>
  );
}
