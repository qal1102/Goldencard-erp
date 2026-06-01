'use client';

import {
  ArrowLeftIcon,
  ArrowRightCircleIcon,
  CheckCircle2Icon,
  ClipboardPlusIcon,
  EditIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { Lead } from '@/db/schema';
import { CreateSurveyDialog } from '@/modules/surveys/components/create-survey-dialog';
import { useLead, useUpdateLeadStatus } from '../hooks/use-leads';
import {
  LEAD_SOURCE_LABELS,
  type LeadSource,
  type LeadStatus,
} from '../schema/lead.schema';
import { ConvertLeadDialog } from './convert-lead-dialog';
import { LeadActivityFeed } from './lead-activity-feed';
import { LeadStatusSelect } from './lead-status-select';

type Props = {
  leadId: string;
  canEdit: boolean;
  canManageSurvey?: boolean;
};

type LeadWithRelations = Lead & {
  assignedUser: { id: string; name: string; email: string } | null;
  createdByUser: { id: string; name: string };
  customer: { id: string; code: string } | null;
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

export function LeadDetail({ leadId, canEdit, canManageSurvey = false }: Props) {
  const { data: lead, isLoading } = useLead(leadId);
  const updateStatus = useUpdateLeadStatus(leadId);
  const [convertOpen, setConvertOpen] = useState(false);
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Không tìm thấy lead
      </div>
    );
  }

  const leadTyped = lead as LeadWithRelations;

  const isTerminal = leadTyped.status === 'won' || leadTyped.status === 'lost';
  const isConverted = Boolean(leadTyped.convertedAt);
  const canConvert = canEdit && leadTyped.status === 'won' && !isConverted;
  // Survey can be created when lead is consulting or awaiting_survey (before conversion)
  const canCreateSurveyFromLead =
    canManageSurvey &&
    (leadTyped.status === 'consulting' || leadTyped.status === 'awaiting_survey');
  // After conversion, survey can still be created from the customer page; keep button here too
  const canCreateSurveyFromCustomer =
    canManageSurvey && isConverted && Boolean(leadTyped.customer);
  const canCreateSurvey = canCreateSurveyFromLead || canCreateSurveyFromCustomer;

  const handleStatusChange = async (status: LeadStatus, lostReason?: string) => {
    const result = await updateStatus.mutateAsync({ status, lostReason });
    if (!result.success) {
      alert(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/crm/leads" />}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="flex-1">
          <p className="font-medium leading-tight">{leadTyped.fullName}</p>
          <p className="font-mono text-xs text-muted-foreground">{leadTyped.code}</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateSurvey && (
            <Button variant="outline" size="sm" onClick={() => setSurveyDialogOpen(true)}>
              <ClipboardPlusIcon className="size-4" />
              Khảo sát
            </Button>
          )}
          {canEdit && !isTerminal && (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/crm/leads/${leadId}/edit`} />}>
              <EditIcon className="size-4" />
              Sửa
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin lead</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Trạng thái</Label>
            <LeadStatusSelect
              currentStatus={leadTyped.status as LeadStatus}
              onStatusChange={handleStatusChange}
              disabled={!canEdit || isTerminal}
            />
          </div>

          <DetailRow label="Số điện thoại" value={leadTyped.phone} />
          <DetailRow label="Email" value={leadTyped.email} />
          <DetailRow label="Địa chỉ" value={leadTyped.address} />
          <DetailRow label="Tỉnh/TP" value={leadTyped.province} />
          <DetailRow
            label="Nguồn"
            value={LEAD_SOURCE_LABELS[leadTyped.source as LeadSource] ?? leadTyped.source}
          />
          <DetailRow label="Công suất dự kiến" value={leadTyped.expectedCapacity} />
          <DetailRow label="Ghi chú" value={leadTyped.notes} />
          <DetailRow label="Phụ trách" value={leadTyped.assignedUser?.name} />

          {leadTyped.status === 'lost' && leadTyped.lostReason && (
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs font-medium text-destructive">Lý do không tiến hành</p>
              <p className="mt-0.5 text-xs">{leadTyped.lostReason}</p>
            </div>
          )}

          {isConverted && leadTyped.customer && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
              <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Đã chuyển thành khách hàng
                </p>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {leadTyped.customer.code}
                </p>
              </div>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/crm/customers" />} className="text-xs">
                Xem DS
              </Button>
            </div>
          )}

          {canConvert && (
            <Button
              variant="default"
              className="mt-1 w-full"
              onClick={() => setConvertOpen(true)}
            >
              <ArrowRightCircleIcon className="size-4" />
              Chuyển thành Khách hàng
            </Button>
          )}
        </CardContent>
      </Card>

      {canConvert && (
        <ConvertLeadDialog
          lead={leadTyped}
          open={convertOpen}
          onOpenChange={setConvertOpen}
          onSuccess={() => {}}
        />
      )}

      {canCreateSurvey && (
        canCreateSurveyFromCustomer && leadTyped.customer ? (
          <CreateSurveyDialog
            customer={{
              id: leadTyped.customer.id,
              code: leadTyped.customer.code,
              fullName: leadTyped.fullName,
              address: leadTyped.address,
              province: leadTyped.province,
            }}
            leadId={leadId}
            open={surveyDialogOpen}
            onOpenChange={setSurveyDialogOpen}
          />
        ) : (
          <CreateSurveyDialog
            lead={{
              id: leadId,
              code: leadTyped.code,
              fullName: leadTyped.fullName,
              address: leadTyped.address,
              province: leadTyped.province,
            }}
            open={surveyDialogOpen}
            onOpenChange={setSurveyDialogOpen}
          />
        )
      )}

      <LeadActivityFeed leadId={leadId} />
    </div>
  );
}
