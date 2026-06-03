'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUSES,
  type HandoverStatus,
} from '../schema/handover.schema';
import { useHandovers } from '../hooks/use-handovers';
import { HandoverStatusBadge } from './handover-status-badge';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function HandoverList() {
  const [statusFilter, setStatusFilter] = useState<HandoverStatus | ''>('');

  const { data: handoverList, isLoading } = useHandovers({
    status: statusFilter || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as HandoverStatus | '')}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value
                  ? HANDOVER_STATUS_LABELS[value as HandoverStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả trạng thái</SelectItem>
            {HANDOVER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {HANDOVER_STATUS_LABELS[s]}
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

      {!isLoading && handoverList?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Chưa có phiếu bàn giao
        </p>
      )}

      {!isLoading &&
        handoverList?.map((handover) => (
          <Card key={handover.id}>
            <CardContent className="flex flex-col gap-2 p-4">
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
                <Button size="sm" variant="outline" render={<Link href={`/handovers/${handover.id}`} />}>
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
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
