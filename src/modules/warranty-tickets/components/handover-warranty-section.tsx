'use client';

import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWarrantyTicketsByHandover } from '../hooks/use-warranty-tickets';
import { WarrantyTicketPriorityBadge } from './warranty-ticket-priority-badge';
import { WarrantyTicketStatusBadge } from './warranty-ticket-status-badge';

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  handoverId: string;
  canWrite: boolean;
  showCreate: boolean;
};

export function HandoverWarrantySection({ handoverId, canWrite, showCreate }: Props) {
  const { data: tickets } = useWarrantyTicketsByHandover(handoverId, showCreate || Boolean(handoverId));

  if (!showCreate && (!tickets || tickets.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Bảo hành / CSKH</CardTitle>
        {showCreate && canWrite && (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/warranty/new?handoverId=${handoverId}`} />
            }
          >
            <PlusIcon className="size-3.5" />
            Tạo yêu cầu bảo hành/CSKH
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!tickets?.length && (
          <p className="text-xs text-muted-foreground">Chưa có yêu cầu bảo hành cho phiếu bàn giao này.</p>
        )}
        {tickets?.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/warranty/${ticket.id}`}
            className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">{ticket.code}</span>
                <WarrantyTicketStatusBadge status={ticket.status} />
                <WarrantyTicketPriorityBadge priority={ticket.priority} />
              </div>
              <p className="mt-0.5 truncate text-xs">{ticket.issueTitle}</p>
              <p className="text-[10px] text-muted-foreground">
                Tiếp nhận: {formatDate(ticket.reportedAt)}
              </p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
