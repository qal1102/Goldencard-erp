'use client';

import { CalendarIcon, PhoneIcon, UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { Lead } from '@/db/schema';
import { getCallResultLabel } from '../lib/lead-labels';

type LeadConsultationFields = Pick<
  Lead,
  | 'consultationNote'
  | 'customerRequirements'
  | 'preferredInstallTime'
  | 'followUpAt'
  | 'lastContactedAt'
  | 'lastCallResult'
> & {
  lastContactedByUser?: { id: string; name: string } | null;
};

function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm whitespace-pre-wrap">{value}</span>
    </div>
  );
}

type Props = {
  lead: LeadConsultationFields;
};

export function LeadConsultationCard({ lead }: Props) {
  const hasContent =
    lead.lastContactedAt ||
    lead.lastCallResult ||
    lead.followUpAt ||
    lead.consultationNote ||
    lead.customerRequirements ||
    lead.preferredInstallTime;

  if (!hasContent) return null;

  const lastResultLabel = lead.lastCallResult ? getCallResultLabel(lead.lastCallResult) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <PhoneIcon className="size-3.5" />
          Thông tin tư vấn
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(lead.lastContactedAt || lead.lastContactedByUser) && (
          <div className="flex flex-col gap-0.5">
            <Label className="text-xs text-muted-foreground">Liên hệ gần nhất</Label>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              {lead.lastContactedAt && (
                <span className="inline-flex items-center gap-1">
                  <CalendarIcon className="size-3 text-muted-foreground" />
                  {formatDateTime(lead.lastContactedAt)}
                </span>
              )}
              {lead.lastContactedByUser && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <UserIcon className="size-3" />
                  {lead.lastContactedByUser.name}
                </span>
              )}
            </div>
          </div>
        )}

        <DetailRow label="Kết quả gọi gần nhất" value={lastResultLabel} />

        {lead.followUpAt && (
          <div className="flex flex-col gap-0.5">
            <Label className="text-xs text-muted-foreground">Hẹn liên hệ lại</Label>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {formatDateTime(lead.followUpAt)}
            </span>
          </div>
        )}

        <DetailRow label="Ghi chú tư vấn" value={lead.consultationNote} />
        <DetailRow label="Nhu cầu khách hàng" value={lead.customerRequirements} />
        <DetailRow label="Thời gian lắp đặt mong muốn" value={lead.preferredInstallTime} />
      </CardContent>
    </Card>
  );
}
