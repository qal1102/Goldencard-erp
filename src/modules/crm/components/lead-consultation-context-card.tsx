'use client';

import { ClipboardListIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { getCallResultLabel } from '../lib/lead-labels';
import type { LeadConsultationContext } from '../schema/lead.schema';

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
  consultation: LeadConsultationContext;
  title?: string;
};

export function LeadConsultationContextCard({
  consultation,
  title = 'Thông tin tư vấn từ Lead',
}: Props) {
  const lastResultLabel = consultation.lastCallResult
    ? getCallResultLabel(consultation.lastCallResult)
    : null;

  const hasContent =
    consultation.customerRequirements ||
    consultation.consultationNote ||
    consultation.preferredInstallTime ||
    consultation.followUpAt ||
    lastResultLabel;

  if (!hasContent) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <ClipboardListIcon className="size-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        <DetailRow label="Nhu cầu khách hàng" value={consultation.customerRequirements} />
        <DetailRow label="Ghi chú tư vấn" value={consultation.consultationNote} />
        <DetailRow label="Thời gian lắp đặt mong muốn" value={consultation.preferredInstallTime} />
        {consultation.followUpAt && (
          <DetailRow label="Hẹn liên hệ / ghi chú đặc biệt" value={formatDateTime(consultation.followUpAt)} />
        )}
        <DetailRow label="Kết quả gọi gần nhất" value={lastResultLabel} />
      </CardContent>
    </Card>
  );
}
