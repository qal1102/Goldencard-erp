import { PhoneIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Customer } from '@/db/schema';

type CustomerWithLead = Customer & {
  lead: { id: string; code: string } | null;
};

type Props = {
  customer: CustomerWithLead;
};

export function CustomerCard({ customer }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium leading-tight">{customer.fullName}</p>
            <p className="font-mono text-xs text-muted-foreground">{customer.code}</p>
          </div>
          {customer.lead && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {customer.lead.code}
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
      </CardContent>
    </Card>
  );
}
