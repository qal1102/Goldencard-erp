'use client';

import { RouteIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectProgressPanel } from '@/lib/project-progress/ui/project-progress-panel';
import { useProjectProgressForLead } from '../hooks/use-project-progress';

type Props = {
  leadId: string;
};

export function LeadProjectProgressCard({ leadId }: Props) {
  const { data: progress, isLoading } = useProjectProgressForLead(leadId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!progress) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <RouteIcon className="size-3.5" />
          Tiến độ dự án
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProjectProgressPanel progress={progress} variant="full" />
      </CardContent>
    </Card>
  );
}
