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
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUSES,
  type QuotationStatus,
} from '../schema/quotation.schema';
import { useQuotations } from '../hooks/use-quotations';
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

export function QuotationList() {
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | ''>('');

  const { data: quotationList, isLoading } = useQuotations({
    status: statusFilter || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as QuotationStatus | '')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value
                  ? QUOTATION_STATUS_LABELS[value as QuotationStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả trạng thái</SelectItem>
            {QUOTATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {QUOTATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && (!quotationList || quotationList.length === 0) && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {statusFilter
            ? 'Không có báo giá nào ở trạng thái này'
            : 'Chưa có báo giá nào'}
        </div>
      )}

      {!isLoading && quotationList && quotationList.length > 0 && (
        <div className="flex flex-col gap-3">
          {quotationList.map((q) => (
            <TappableListCard
              key={q.id}
              href={`/quotations/${q.id}`}
              ariaLabel={`Xem báo giá ${q.code}`}
            >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {q.code}
                      </span>
                      <QuotationStatusBadge status={q.status as QuotationStatus} />
                    </div>
                    <p className="truncate text-sm font-medium">
                      {q.customerNameSnapshot}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Khảo sát:{' '}
                      <span className="font-mono">{q.survey?.code ?? '—'}</span>
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
      )}
    </div>
  );
}
