'use client';

import {
  ArrowLeftIcon,
  CalendarIcon,
  ClipboardPlusIcon,
  UserIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateSurveyDialog } from '@/modules/surveys/components/create-survey-dialog';
import { SurveyStatusBadge } from '@/modules/surveys/components/survey-status-badge';
import { useSurveysByCustomer } from '@/modules/surveys/hooks/use-surveys';
import type { SurveyStatus } from '@/modules/surveys/schema/survey.schema';
import { useCustomer } from '../hooks/use-customers';
import type { LeadSource } from '../schema/lead.schema';
import { LeadActivityFeed } from './lead-activity-feed';
import { LeadSourceBadge } from './lead-source-badge';

type Props = {
  customerId: string;
  canManageSurvey?: boolean;
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CustomerDetail({ customerId, canManageSurvey = false }: Props) {
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: surveys } = useSurveysByCustomer(customerId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Không tìm thấy khách hàng
      </div>
    );
  }

  const hasLead = Boolean(customer.lead);
  const hasReferral = Boolean(customer.referrerName);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/crm/customers" />}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="flex-1">
          <p className="font-medium leading-tight">{customer.fullName}</p>
          <p className="font-mono text-xs text-muted-foreground">{customer.code}</p>
        </div>
        {canManageSurvey && (
          <Button variant="outline" size="sm" onClick={() => setSurveyDialogOpen(true)}>
            <ClipboardPlusIcon className="size-4" />
            Tạo khảo sát
          </Button>
        )}
      </div>

      {/* Customer info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DetailRow label="Số điện thoại" value={customer.phone} />
          <DetailRow label="Email" value={customer.email} />
          <DetailRow label="Địa chỉ" value={customer.address} />
          <DetailRow label="Tỉnh/TP" value={customer.province} />
          <DetailRow label="Ghi chú" value={customer.notes} />
        </CardContent>
      </Card>

      {/* Originating lead */}
      {hasLead && customer.lead && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <UsersIcon className="size-3.5" />
              Nguồn gốc lead
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Link
                href={`/crm/leads/${customer.lead.id}`}
                className="font-mono text-xs font-semibold text-primary hover:underline"
              >
                {customer.lead.code}
              </Link>
              <LeadSourceBadge source={customer.lead.source as LeadSource} />
            </div>
            {customer.lead.expectedCapacity && (
              <div className="flex items-center gap-1.5">
                <ZapIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-sm">{customer.lead.expectedCapacity}</span>
              </div>
            )}
            {customer.lead.assignedUser && (
              <div className="flex items-center gap-1.5">
                <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-sm">{customer.lead.assignedUser.name}</span>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {formatDate(customer.lead.createdAt) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3 shrink-0" />
                  <span>Tạo lead: {formatDate(customer.lead.createdAt)}</span>
                </div>
              )}
              {formatDate(customer.lead.wonAt) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3 shrink-0" />
                  <span>Chốt hợp đồng: {formatDate(customer.lead.wonAt)}</span>
                </div>
              )}
              {formatDate(customer.lead.convertedAt) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3 shrink-0" />
                  <span>
                    Chuyển đổi: {formatDate(customer.lead.convertedAt)}
                    {customer.convertedByUser && ` · ${customer.convertedByUser.name}`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral info */}
      {hasReferral && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Thông tin giới thiệu</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <DetailRow label="Người giới thiệu" value={customer.referrerName} />
            <DetailRow label="SĐT người giới thiệu" value={customer.referrerPhone} />
            <DetailRow label="Ghi chú giới thiệu" value={customer.referralNote} />
          </CardContent>
        </Card>
      )}

      {/* Surveys */}
      {(surveys && surveys.length > 0) || canManageSurvey ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Phiếu khảo sát</CardTitle>
              {canManageSurvey && (
                <Button variant="ghost" size="sm" onClick={() => setSurveyDialogOpen(true)}>
                  <ClipboardPlusIcon className="size-3.5" />
                  Thêm
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(!surveys || surveys.length === 0) && (
              <p className="text-xs text-muted-foreground">Chưa có phiếu khảo sát nào.</p>
            )}
            {surveys?.map((sv) => (
              <Link
                key={sv.id}
                href={`/surveys/${sv.id}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{sv.code}</span>
                  {sv.assignedUser && (
                    <span className="text-xs text-muted-foreground">{sv.assignedUser.name}</span>
                  )}
                </div>
                <SurveyStatusBadge status={sv.status as SurveyStatus} />
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Activity feed — tied to originating lead */}
      {hasLead && customer.lead && (
        <LeadActivityFeed leadId={customer.lead.id} readOnly />
      )}

      {canManageSurvey && (
        <CreateSurveyDialog
          customer={{
            id: customer.id,
            code: customer.code,
            fullName: customer.fullName,
            address: customer.address,
            province: customer.province,
          }}
          leadId={customer.lead?.id}
          open={surveyDialogOpen}
          onOpenChange={setSurveyDialogOpen}
        />
      )}
    </div>
  );
}
