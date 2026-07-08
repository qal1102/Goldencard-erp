'use client';

import { CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { UserAvatar } from '@/components/auth/user-avatar';
import { ModuleListError } from '@/components/ui/module-list-error';
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
import { ALL_STATUS_FILTER } from '@/lib/filters/status-filter';
import { surveyHasTechnicalCompletionGaps } from '../lib/survey-completion-requirements';
import { normalizeSurveyFilters, useSurveys } from '../hooks/use-surveys';
import type { SurveyRow } from '../lib/survey.queries';
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
  cacheScope?: string;
  initialData?: SurveyRow[];
  initialError?: string | null;
};

export function SurveyList({ isTechnician, cacheScope, initialData, initialError = null }: Props) {
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | typeof ALL_STATUS_FILTER>(
    ALL_STATUS_FILTER,
  );

  const filters = useMemo(
    () =>
      normalizeSurveyFilters({
        status: statusFilter === ALL_STATUS_FILTER ? undefined : statusFilter,
      }),
    [statusFilter],
  );

  const hasInitial = statusFilter === ALL_STATUS_FILTER && initialData !== undefined && !initialError;

  const {
    data: surveyList,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useSurveys(filters, { cacheScope, initialData: hasInitial ? initialData : undefined });

  const showSkeleton = isPending && !surveyList;
  const showError = !surveyList && (Boolean(initialError) || isError);
  const errorMessage =
    initialError ??
    (error instanceof Error
      ? error.message
      : 'Không thể tải danh sách phiếu khảo sát. Vui lòng thử lại.');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter((v ?? ALL_STATUS_FILTER) as SurveyStatus | typeof ALL_STATUS_FILTER)
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả trạng thái">
              {(value) =>
                value && value !== ALL_STATUS_FILTER
                  ? SURVEY_STATUS_LABELS[value as SurveyStatus]
                  : 'Tất cả trạng thái'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_FILTER}>Tất cả trạng thái</SelectItem>
            {SURVEY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {SURVEY_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFetching && surveyList && surveyList.length > 0 && (
        <p className="text-xs text-muted-foreground">Đang cập nhật danh sách...</p>
      )}

      {showError && (
        <ModuleListError
          message={errorMessage}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      )}

      {showSkeleton && !showError && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!showSkeleton && !showError && surveyList?.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {statusFilter !== ALL_STATUS_FILTER ? 'Không có phiếu khảo sát nào ở trạng thái này' : 'Chưa có phiếu khảo sát'}
        </div>
      )}

      {!showSkeleton && !showError && surveyList && surveyList.length > 0 && (
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
                    variant="default"
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
                      <UserAvatar
                        name={survey.assignedUser.name}
                        avatarUrl={survey.assignedUser.avatarUrl}
                        className="size-5 text-[10px]"
                      />
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
