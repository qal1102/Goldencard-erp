import { PhoneIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { tappableListCardClassName } from '@/components/ui/tappable-list-card';
import type { Customer, Lead } from '@/db/schema';
import { LeadStatusBadge } from './lead-status-badge';
import type { LeadStatus } from '../schema/lead.schema';

type CustomerWithRelations = Customer & {
  lead: { id: string; code: string } | null;
  linkedLeads: Pick<Lead, 'id' | 'code' | 'status' | 'createdAt'>[];
  linkedLeadCount: number;
  latestLinkedLead: Pick<Lead, 'id' | 'code' | 'status' | 'createdAt'> | null;
};

type Props = {
  customer: CustomerWithRelations;
};

export function CustomerCard({ customer }: Props) {
  const leadCount = customer.linkedLeadCount ?? customer.linkedLeads?.length ?? 0;
  const latestLead = customer.latestLinkedLead ?? customer.linkedLeads?.[0] ?? null;

  return (
    <Link
      href={`/crm/customers/${customer.id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Xem khách hàng ${customer.fullName}`}
    >
      <Card className={tappableListCardClassName}>
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium leading-tight">{customer.fullName}</p>
              <p className="font-mono text-xs text-muted-foreground">{customer.code}</p>
            </div>
            {leadCount > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <UsersIcon className="size-3" />
                {leadCount} dự án
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <PhoneIcon className="size-3.5 shrink-0" />
            <span>{customer.phone}</span>
          </div>
          {customer.province && (
            <p className="text-xs text-muted-foreground">{customer.province}</p>
          )}
          {latestLead && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="font-mono text-[11px] text-muted-foreground">{latestLead.code}</span>
              <LeadStatusBadge status={latestLead.status as LeadStatus} className="text-[10px]" />
            </div>
          )}
          {!latestLead && customer.lead && (
            <span className="font-mono text-[11px] text-muted-foreground">{customer.lead.code}</span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
