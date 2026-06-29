'use client';

import {
  ArrowRightCircleIcon,
  ClipboardPlusIcon,
  MapPinIcon,
  MessageSquareIcon,
  PhoneCallIcon,
  PhoneIcon,
  PlusCircleIcon,
  RefreshCwIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EditableAddressCard } from '@/components/address/editable-address-card';
import { BackButton } from '@/components/navigation/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeadActivity } from '@/db/schema';
import { buildFullAddress } from '@/lib/address/format-address';
import { getProgressRecord } from '@/lib/project-progress/types';
import { QuotationStatusBadge } from '@/modules/quotations/components/quotation-status-badge';
import { displayQuotationCode } from '@/modules/quotations/lib/quotation-display';
import type { QuotationStatus } from '@/modules/quotations/schema/quotation.schema';
import { CreateSurveyDialog } from '@/modules/surveys/components/create-survey-dialog';
import { SurveyStatusBadge } from '@/modules/surveys/components/survey-status-badge';
import type { SurveyStatus } from '@/modules/surveys/schema/survey.schema';
import { useCustomer, useUpdateCustomerAddress } from '../hooks/use-customers';
import { useProjectProgressForLeads } from '../hooks/use-project-progress';
import type { LeadSource, LeadStatus } from '../schema/lead.schema';
import { ACTIVITY_TYPE_LABELS, type ActivityType } from '../schema/lead.schema';
import { LeadSourceBadge } from './lead-source-badge';
import { CustomerCertificateLinks } from '@/modules/warranty-certificates/components/customer-certificate-links';
import { CustomerWarrantySection } from '@/modules/warranty-tickets/components/customer-warranty-section';
import type { CustomerDetailData } from '../lib/customer.queries';
import { LeadStatusBadge } from './lead-status-badge';

type Props = {
  customerId: string;
  canManageSurvey?: boolean;
  canCreateLead?: boolean;
  canEdit?: boolean;
  canCreateWarranty?: boolean;
  initialData?: CustomerDetailData;
};

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  note: <MessageSquareIcon className="size-3.5" />,
  call: <PhoneIcon className="size-3.5" />,
  call_attempt: <PhoneCallIcon className="size-3.5" />,
  call_result: <PhoneIcon className="size-3.5" />,
  status_change: <RefreshCwIcon className="size-3.5" />,
  assignment_change: <UserIcon className="size-3.5" />,
  conversion: <ArrowRightCircleIcon className="size-3.5" />,
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

function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num == null || Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

type ActivityRow = LeadActivity & {
  createdByUser: { id: string; name: string };
  lead?: { id: string; code: string } | null;
};

export function CustomerDetail({
  customerId,
  canManageSurvey = false,
  canCreateLead = false,
  canEdit = false,
  canCreateWarranty = false,
  initialData,
}: Props) {
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const { data: customer, isLoading } = useCustomer(customerId, { initialData });
  const updateAddress = useUpdateCustomerAddress(customerId);

  const linkedLeads = customer?.linkedLeads
    ? [...customer.linkedLeads].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : [];

  const leadIds = linkedLeads.map((l) => l.id);
  const { data: progressMap } = useProjectProgressForLeads(leadIds);

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

  const hasReferral = Boolean(customer.referrerName);
  const activities = (customer.relatedActivities ?? []) as ActivityRow[];
  const surveys = customer.relatedSurveys ?? [];
  const quotations = customer.relatedQuotations ?? [];
  const legacyLead = customer.lead;
  const primaryLead = linkedLeads[0] ?? legacyLead;
  const showCreateSurvey = canManageSurvey && linkedLeads.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <BackButton fallbackHref="/crm/customers" />
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{customer.fullName}</p>
          <p className="font-mono text-xs text-muted-foreground">{customer.code}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreateLead && (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={`/crm/leads/new?customerId=${customerId}`} />}
            >
              <PlusCircleIcon className="size-4" />
              Tạo cơ hội / dự án mới
            </Button>
          )}
          {showCreateSurvey && (
            <Button
              size="sm"
              className="bg-sky-600 text-white hover:bg-sky-700"
              onClick={() => setSurveyDialogOpen(true)}
            >
              <ClipboardPlusIcon className="size-4" />
              Tạo khảo sát
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <UsersIcon className="size-3.5" />
            Cơ hội / Dự án liên quan
            {linkedLeads.length > 0 && (
              <span className="font-normal text-muted-foreground">({linkedLeads.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {linkedLeads.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">Chưa có cơ hội/dự án liên kết.</p>
              {canCreateLead && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  nativeButton={false}
                  render={<Link href={`/crm/leads/new?customerId=${customerId}`} />}
                >
                  <PlusCircleIcon className="size-4" />
                  Tạo cơ hội / dự án mới
                </Button>
              )}
            </div>
          )}
          {linkedLeads.map((lead) => {
            const progress = progressMap?.[lead.id];
            const latestSurvey = progress ? getProgressRecord(progress, 'survey') : null;
            const latestQuotation = progress ? getProgressRecord(progress, 'quotation') : null;
            const latestContract = progress ? getProgressRecord(progress, 'contract') : null;
            const latestWorkOrder = progress ? getProgressRecord(progress, 'work_order') : null;
            const latestHandover = progress ? getProgressRecord(progress, 'handover') : null;
            const installLine = buildFullAddress(lead.address, lead.province);

            return (
              <Link
                key={lead.id}
                href={`/crm/leads/${lead.id}`}
                className="flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">{lead.code}</span>
                    <LeadSourceBadge source={lead.source as LeadSource} />
                  </div>
                  {lead.expectedCapacity && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {lead.expectedCapacity}
                    </span>
                  )}
                </div>
                {progress ? (
                  <div className="rounded-md bg-muted/50 px-2 py-1.5">
                    <p className="text-sm font-semibold leading-snug">{progress.currentStageLabel}</p>
                    <p className="text-xs text-muted-foreground">Tiếp theo: {progress.nextAction}</p>
                  </div>
                ) : null}
                <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>Bán hàng:</span>
                  <LeadStatusBadge status={lead.status as LeadStatus} className="opacity-90" />
                </p>
                {installLine && (
                  <p className="flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPinIcon className="mt-0.5 size-3 shrink-0" />
                    <span>{installLine}</span>
                  </p>
                )}
                {lead.assignedUser && (
                  <p className="text-xs text-muted-foreground">
                    Phụ trách: {lead.assignedUser.name}
                  </p>
                )}
                {(latestSurvey || latestQuotation || latestContract || latestWorkOrder || latestHandover) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {latestSurvey && (
                      <span>
                        KS:{' '}
                        <span className="font-mono text-primary">{latestSurvey.code}</span>
                        {' · '}
                        {latestSurvey.statusLabel}
                      </span>
                    )}
                    {latestQuotation && (
                      <span>
                        BG:{' '}
                        <span className="font-mono text-primary">{latestQuotation.code}</span>
                        {' · '}
                        {latestQuotation.statusLabel}
                      </span>
                    )}
                    {latestContract && (
                      <span>
                        HD:{' '}
                        <span className="font-mono text-primary">{latestContract.code}</span>
                        {' · '}
                        {latestContract.statusLabel}
                      </span>
                    )}
                    {latestWorkOrder && (
                      <span>
                        LTC:{' '}
                        <span className="font-mono text-primary">{latestWorkOrder.code}</span>
                        {' · '}
                        {latestWorkOrder.statusLabel}
                      </span>
                    )}
                    {latestHandover && (
                      <span>
                        BB:{' '}
                        <span className="font-mono text-primary">{latestHandover.code}</span>
                        {' · '}
                        {latestHandover.statusLabel}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
          {legacyLead && !linkedLeads.some((l) => l.id === legacyLead.id) && (
            <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Cơ hội chuyển đổi (legacy):{' '}
              <Link href={`/crm/leads/${legacyLead.id}`} className="font-mono text-primary hover:underline">
                {legacyLead.code}
              </Link>
              {formatDate(legacyLead.convertedAt) && ` · ${formatDate(legacyLead.convertedAt)}`}
            </div>
          )}
        </CardContent>
      </Card>

      <EditableAddressCard
        title="Địa chỉ liên hệ"
        addressFieldLabel="Địa chỉ liên hệ"
        address={customer.address}
        province={customer.province}
        canEdit={canEdit}
        showWhenEmpty
        isPending={updateAddress.isPending}
        onSave={async (data) => {
          const result = await updateAddress.mutateAsync(data);
          return result.success
            ? { success: true }
            : { success: false, error: result.error };
        }}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Thông tin liên hệ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0">
          <DetailRow label="Số điện thoại" value={customer.phone} />
          <DetailRow label="Email" value={customer.email} />
          <DetailRow label="Ghi chú" value={customer.notes} />
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Phiếu khảo sát</CardTitle>
            {showCreateSurvey && (
              <Button variant="ghost" size="sm" onClick={() => setSurveyDialogOpen(true)}>
                <ClipboardPlusIcon className="size-3.5" />
                Thêm
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {surveys.length === 0 && (
            <p className="text-xs text-muted-foreground">Chưa có phiếu khảo sát nào.</p>
          )}
          {surveys.map((sv) => (
            <Link
              key={sv.id}
              href={`/surveys/${sv.id}`}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{sv.code}</span>
                  {sv.lead && !Array.isArray(sv.lead) && (
                    <span className="text-[10px] text-muted-foreground">{sv.lead.code}</span>
                  )}
                </div>
                {sv.assignedUser && (
                  <span className="text-xs text-muted-foreground">{sv.assignedUser.name}</span>
                )}
              </div>
              <SurveyStatusBadge status={sv.status as SurveyStatus} />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Báo giá</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {quotations.length === 0 && (
            <p className="text-xs text-muted-foreground">Chưa có báo giá nào.</p>
          )}
          {quotations.map((q) => (
            <Link
              key={q.id}
              href={`/quotations/${q.id}`}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs font-semibold text-primary">
                  {displayQuotationCode(q.code)}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(q.grandTotal)}
                </span>
              </div>
              <QuotationStatusBadge status={q.status as QuotationStatus} />
            </Link>
          ))}
        </CardContent>
      </Card>

      <CustomerCertificateLinks customerId={customerId} />
      <CustomerWarrantySection customerId={customerId} canWrite={canCreateWarranty} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lịch sử hoạt động</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {activities.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">Chưa có hoạt động</p>
          )}
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-2.5">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/5">
                {ACTIVITY_ICONS[activity.type as ActivityType] ?? ACTIVITY_ICONS.note}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-medium">
                    {ACTIVITY_TYPE_LABELS[activity.type as ActivityType] ?? activity.type}
                    {activity.lead && (
                      <Link
                        href={`/crm/leads/${activity.lead.id}`}
                        className="ml-1.5 font-mono text-[10px] text-primary hover:underline"
                      >
                        {activity.lead.code}
                      </Link>
                    )}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDateTime(activity.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{activity.content}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                  {activity.createdByUser.name}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {showCreateSurvey && primaryLead && (
        <CreateSurveyDialog
          customer={{
            id: customer.id,
            code: customer.code,
            fullName: customer.fullName,
            address: customer.address,
            province: customer.province,
          }}
          leadId={primaryLead.id}
          installationAddress={primaryLead.address}
          installationProvince={primaryLead.province}
          open={surveyDialogOpen}
          onOpenChange={setSurveyDialogOpen}
        />
      )}
    </div>
  );
}
