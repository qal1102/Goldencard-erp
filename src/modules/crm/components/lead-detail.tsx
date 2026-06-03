'use client';

import {
  ArrowRightCircleIcon,
  CheckCircle2Icon,
  ClipboardPlusIcon,
  EditIcon,
  LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EditableAddressCard } from '@/components/address/editable-address-card';
import { BackButton } from '@/components/navigation/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { Lead } from '@/db/schema';
import { CreateSurveyDialog } from '@/modules/surveys/components/create-survey-dialog';
import { useLead, useUpdateLeadInstallationAddress, useUpdateLeadStatus } from '../hooks/use-leads';
import {
  LEAD_SOURCE_LABELS,
  type LeadSource,
  type LeadStatus,
} from '../schema/lead.schema';
import { ConvertLeadDialog } from './convert-lead-dialog';
import { CallCustomerButton } from './call-customer-button';
import { LeadActivityFeed } from './lead-activity-feed';
import { LeadConsultationCard } from './lead-consultation-card';
import { LeadProjectProgressCard } from './lead-project-progress-card';
import { LeadStatusSelect } from './lead-status-select';

type Props = {
  leadId: string;
  canEdit: boolean;
  canManageSurvey?: boolean;
  linkedCustomerNotice?: string | null;
  customerCreatedNotice?: string | null;
};

type LeadWithRelations = Lead & {
  assignedUser: { id: string; name: string; email: string } | null;
  createdByUser: { id: string; name: string };
  customer: { id: string; code: string; fullName: string; phone: string } | null;
  linkedCustomer: { id: string; code: string; fullName: string; phone: string } | null;
  lastContactedByUser?: { id: string; name: string } | null;
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

export function LeadDetail({
  leadId,
  canEdit,
  canManageSurvey = false,
  linkedCustomerNotice = null,
  customerCreatedNotice = null,
}: Props) {
  const { data: lead, isLoading } = useLead(leadId);
  const updateStatus = useUpdateLeadStatus(leadId);
  const updateInstallationAddress = useUpdateLeadInstallationAddress(leadId);
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
        Không tìm thấy cơ hội
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
    canManageSurvey &&
    (isConverted || Boolean(leadTyped.linkedCustomer)) &&
    Boolean(leadTyped.linkedCustomer ?? leadTyped.customer);
  const canCreateSurvey = canCreateSurveyFromLead || canCreateSurveyFromCustomer;
  const masterCustomer = leadTyped.linkedCustomer ?? leadTyped.customer;

  const handleStatusChange = async (status: LeadStatus, lostReason?: string) => {
    const result = await updateStatus.mutateAsync({ status, lostReason });
    if (!result.success) {
      alert(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BackButton fallbackHref="/crm/leads" />
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

      {(linkedCustomerNotice || customerCreatedNotice) && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
          <LinkIcon className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-blue-800 dark:text-blue-200">
            {linkedCustomerNotice
              ? `Số điện thoại này đã tồn tại. Cơ hội mới được liên kết với khách hàng hiện có ${linkedCustomerNotice}.`
              : `Đã tạo hồ sơ khách hàng ${customerCreatedNotice} và liên kết với cơ hội này.`}
          </p>
        </div>
      )}

      {masterCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Khách hàng liên kết</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{masterCustomer.fullName}</p>
                <p className="font-mono text-xs text-muted-foreground">{masterCustomer.code}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/crm/customers/${masterCustomer.id}`} />}
              >
                Xem khách hàng
              </Button>
            </div>
            <DetailRow label="Số điện thoại" value={masterCustomer.phone} />
          </CardContent>
        </Card>
      )}

      <LeadProjectProgressCard leadId={leadId} leadStatus={leadTyped.status as LeadStatus} />

      <EditableAddressCard
        title="Địa chỉ lắp đặt dự án"
        addressFieldLabel="Địa chỉ lắp đặt"
        address={leadTyped.address}
        province={leadTyped.province}
        canEdit={canEdit && leadTyped.status !== 'lost'}
        showWhenEmpty
        isPending={updateInstallationAddress.isPending}
        onSave={async (data) => {
          const result = await updateInstallationAddress.mutateAsync(data);
          return result.success
            ? { success: true }
            : { success: false, error: result.error };
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin cơ hội</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Trạng thái bán hàng / liên hệ ban đầu
            </Label>
            <LeadStatusSelect
              currentStatus={leadTyped.status as LeadStatus}
              onStatusChange={handleStatusChange}
              disabled={!canEdit || isTerminal}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Tiến độ dự án thực tế được lấy từ khảo sát, báo giá, hợp đồng và lệnh thi công.
            </p>
          </div>

          <DetailRow label="Số điện thoại" value={leadTyped.phone} />
          {canEdit && !isTerminal && leadTyped.phone && (
            <CallCustomerButton
              leadId={leadId}
              phone={leadTyped.phone}
              defaultConsultation={{
                consultationNote: leadTyped.consultationNote,
                customerRequirements: leadTyped.customerRequirements,
                followUpAt: leadTyped.followUpAt,
              }}
            />
          )}
          <DetailRow label="Email" value={leadTyped.email} />
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

          {isConverted && masterCustomer && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
              <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Đã chuyển thành khách hàng
                </p>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {masterCustomer.code}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href={`/crm/customers/${masterCustomer.id}`} />}
                className="text-xs"
              >
                Xem KH
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

      <LeadConsultationCard lead={leadTyped} />

      {canConvert && (
        <ConvertLeadDialog
          lead={leadTyped}
          open={convertOpen}
          onOpenChange={setConvertOpen}
          onSuccess={() => {}}
        />
      )}

      {canCreateSurvey && (
        canCreateSurveyFromCustomer && masterCustomer ? (
          <CreateSurveyDialog
            customer={{
              id: masterCustomer.id,
              code: masterCustomer.code,
              fullName: leadTyped.fullName,
              address: leadTyped.address,
              province: leadTyped.province,
            }}
            leadId={leadId}
            installationAddress={leadTyped.address}
            installationProvince={leadTyped.province}
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
            installationAddress={leadTyped.address}
            installationProvince={leadTyped.province}
            open={surveyDialogOpen}
            onOpenChange={setSurveyDialogOpen}
          />
        )
      )}

      <LeadActivityFeed leadId={leadId} />
    </div>
  );
}
