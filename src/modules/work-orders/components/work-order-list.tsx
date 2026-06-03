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
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  type WorkOrderStatus,
} from '../schema/work-order.schema';
import { useWorkOrders } from '../hooks/use-work-orders';
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
};

export function WorkOrderList({ isTechnician = false }: Props) {
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | ''>('');

  const { data: workOrderList, isLoading } = useWorkOrders({
    status: statusFilter || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as WorkOrderStatus | '')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value
                  ? WORK_ORDER_STATUS_LABELS[value as WorkOrderStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả trạng thái</SelectItem>
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

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && workOrderList?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Chưa có lệnh thi công
        </p>
      )}

      {!isLoading &&
        workOrderList?.map((wo) => (
          <Card key={wo.id}>
            <CardContent className="flex flex-col gap-2 p-4">
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
                <Button size="sm" variant="outline" render={<Link href={`/work-orders/${wo.id}`} />}>
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
                {wo.assignedUser && (
                  <p>Kỹ thuật: {wo.assignedUser.name}</p>
                )}
                <p>
                  Lịch thi công:{' '}
                  {wo.scheduledStartAt
                    ? formatDate(wo.scheduledStartAt)
                    : '—'}
                  {wo.scheduledEndAt && ` → ${formatDate(wo.scheduledEndAt)}`}
                </p>
                {wo.installationAddress && (
                  <p className="line-clamp-2">{wo.installationAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
