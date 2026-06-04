'use client';

import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { stopCardNavigation, TappableListCard } from '@/components/ui/tappable-list-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  WARRANTY_TICKET_PRIORITIES,
  WARRANTY_TICKET_PRIORITY_LABELS,
  WARRANTY_TICKET_STATUS_LABELS,
  type WarrantyTicketPriority,
  type WarrantyTicketStatus,
} from '../schema/warranty-ticket.schema';
import { useWarrantyTickets } from '../hooks/use-warranty-tickets';
import { WarrantyTicketPriorityBadge } from './warranty-ticket-priority-badge';
import { WarrantyTicketStatusBadge } from './warranty-ticket-status-badge';

const LIST_STATUS_FILTER = [
  '',
  'open',
  'assigned',
  'in_progress',
  'resolved',
] as const;

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  canWrite?: boolean;
};

export function WarrantyTicketList({ canWrite = false }: Props) {
  const [statusFilter, setStatusFilter] = useState<(typeof LIST_STATUS_FILTER)[number]>('');
  const [priorityFilter, setPriorityFilter] = useState<WarrantyTicketPriority | ''>('');

  const { data: tickets, isLoading } = useWarrantyTickets({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as (typeof LIST_STATUS_FILTER)[number])}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value
                  ? WARRANTY_TICKET_STATUS_LABELS[value as WarrantyTicketStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả trạng thái</SelectItem>
            {LIST_STATUS_FILTER.filter(Boolean).map((s) => (
              <SelectItem key={s} value={s}>
                {WARRANTY_TICKET_STATUS_LABELS[s as WarrantyTicketStatus]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as WarrantyTicketPriority | '')}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Mức ưu tiên">
              {(value) =>
                value
                  ? WARRANTY_TICKET_PRIORITY_LABELS[value as WarrantyTicketPriority]
                  : 'Mức ưu tiên'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả mức ưu tiên</SelectItem>
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

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && (!tickets || tickets.length === 0) && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {statusFilter || priorityFilter
            ? 'Không có yêu cầu phù hợp bộ lọc'
            : 'Chưa có yêu cầu bảo hành/CSKH'}
        </p>
      )}

      {!isLoading &&
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
