import {
  WARRANTY_ACTIVE_STATUSES,
  WARRANTY_TICKET_STATUS_LABELS,
  type WarrantyTicketStatus,
} from '@/modules/warranty-tickets/schema/warranty-ticket.schema';

export type WarrantyTicketProgressRow = {
  id: string;
  code: string;
  status: string;
  priority: string;
  issueTitle: string;
  reportedAt: Date;
};

export function pickDrivingWarrantyTicket(
  tickets: WarrantyTicketProgressRow[],
): WarrantyTicketProgressRow | null {
  if (tickets.length === 0) return null;

  const sorted = [...tickets].sort(
    (a, b) => b.reportedAt.getTime() - a.reportedAt.getTime(),
  );

  const active = sorted.find((t) =>
    WARRANTY_ACTIVE_STATUSES.includes(t.status as WarrantyTicketStatus),
  );
  if (active) return active;

  const resolved = sorted.find((t) => t.status === 'resolved');
  if (resolved) return resolved;

  return null;
}

export function warrantyStatusLabel(status: string): string {
  return WARRANTY_TICKET_STATUS_LABELS[status as WarrantyTicketStatus] ?? status;
}
