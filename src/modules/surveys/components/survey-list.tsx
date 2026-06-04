'use client';

import { CalendarIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { stopCardNavigation, TappableListCard } from '@/components/ui/tappable-list-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { surveyHasTechnicalCompletionGaps } from '../lib/survey-completion-requirements';
import { useSurveys } from '../hooks/use-surveys';
import { SURVEY_STATUS_LABELS, SURVEY_STATUSES, type SurveyStatus } from '../schema/survey.schema';
import { SurveyStatusBadge } from './survey-status-badge';

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  isTechnician: boolean;
};

export function SurveyList({ isTechnician }: Props) {
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | ''>('');

  const { data: surveyList, isLoading } = useSurveys({
    status: statusFilter || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as SurveyStatus | '')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value
                  ? SURVEY_STATUS_LABELS[value as SurveyStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả trạng thái</SelectItem>
            {SURVEY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {SURVEY_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && (!surveyList || surveyList.length === 0) && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {statusFilter ? 'Không có phiếu khảo sát nào ở trạng thái này' : 'Chưa có phiếu khảo sát'}
        </div>
      )}

      {!isLoading && surveyList && surveyList.length > 0 && (
        <div className="flex flex-col gap-3">
          {surveyList.map((survey) => (
            <TappableListCard
              key={survey.id}
              href={`/surveys/${survey.id}`}
              ariaLabel={`Xem phiếu khảo sát ${survey.code}`}
            >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {survey.code}
                      </span>
                      <SurveyStatusBadge status={survey.status as SurveyStatus} />
                    </div>
                    <p className="text-sm font-medium truncate">
                      {survey.customer?.fullName ?? survey.lead?.fullName ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {survey.customer?.code ??
                        (survey.lead ? `Lead: ${survey.lead.code}` : null)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/surveys/${survey.id}`} />}
                    className="shrink-0"
                    onClick={stopCardNavigation}
                  >
                    {isTechnician ? 'Mở phiếu' : 'Xem'}
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {survey.assignedUser && (
                    <span className="flex items-center gap-1">
                      <UserIcon className="size-3 shrink-0" />
                      {survey.assignedUser.name}
                    </span>
                  )}
                  {survey.scheduledAt && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3 shrink-0" />
                      {formatDate(survey.scheduledAt)}
                    </span>
                  )}
                  {!survey.assignedUser && !isTechnician && (
                    <span className="text-amber-600 dark:text-amber-400">Chưa phân công</span>
                  )}
                  {(survey.status === 'assigned' || survey.status === 'pending') &&
                    surveyHasTechnicalCompletionGaps(survey) && (
                      <span className="text-amber-600 dark:text-amber-400">
                        Thiếu dữ liệu kỹ thuật
                      </span>
                    )}
                </div>
            </TappableListCard>
          ))}
        </div>
      )}
    </div>
  );
}
