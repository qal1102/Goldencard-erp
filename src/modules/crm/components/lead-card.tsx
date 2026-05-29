import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import type { Lead } from '@/db/schema';
import { cn } from '@/lib/utils';
import type { LeadSource } from '../schema/lead.schema';
import { LeadSourceBadge } from './lead-source-badge';

type LeadWithUser = Lead & {
  assignedUser: { id: string; name: string } | null;
};

type Props = {
  lead: LeadWithUser;
  className?: string;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function LeadCard({ lead, className }: Props) {
  return (
    <Link href={`/crm/leads/${lead.id}`}>
      <Card
        className={cn(
          'cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]',
          className,
        )}
        size="sm"
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight">{lead.fullName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{lead.phone}</p>
            </div>
            <LeadSourceBadge source={lead.source as LeadSource} />
          </div>

          {lead.expectedCapacity && (
            <p className="mt-1.5 text-xs text-muted-foreground">{lead.expectedCapacity}</p>
          )}

          <div className="mt-2 flex items-center justify-between gap-1">
            <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
            {lead.assignedUser && (
              <span className="max-w-[100px] truncate text-xs text-muted-foreground">
                {lead.assignedUser.name}
              </span>
            )}
          </div>

          <p className="mt-1 text-[10px] font-mono text-muted-foreground/60">{lead.code}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
