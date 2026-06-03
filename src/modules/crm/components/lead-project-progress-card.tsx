'use client';

import { AlertTriangleIcon, RouteIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  hasDownstreamDeliveryRecords,
  isLeadSalesStatusStale,
} from '@/lib/project-progress/sales-status-staleness';
import { ProjectProgressPanel } from '@/lib/project-progress/ui/project-progress-panel';
import type { LeadStatus } from '../schema/lead.schema';
import { useProjectProgressForLead } from '../hooks/use-project-progress';

type Props = {
  leadId: string;
  leadStatus: LeadStatus;
};

export function LeadProjectProgressCard({ leadId, leadStatus }: Props) {
  const { data: progress, isLoading } = useProjectProgressForLead(leadId);

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!progress) return null;

  const showStaleWarning =
    hasDownstreamDeliveryRecords(progress) &&
    isLeadSalesStatusStale(progress, leadStatus);

  return (
    <Card className="border-primary/25 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <RouteIcon className="size-3.5 text-primary" />
          Tiến độ dự án hiện tại
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Nguồn: khảo sát, báo giá, hợp đồng và lệnh thi công liên kết
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="rounded-lg border border-primary/15 bg-background px-3 py-2.5">
          <p className="text-base font-semibold leading-snug">{progress.currentStageLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Việc tiếp theo: <span className="text-foreground">{progress.nextAction}</span>
          </p>
        </div>
        {showStaleWarning && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
            <p>Trạng thái bán hàng đang cũ so với tiến độ dự án thực tế.</p>
          </div>
        )}
        <ProjectProgressPanel progress={progress} variant="chain" />
      </CardContent>
    </Card>
  );
}
