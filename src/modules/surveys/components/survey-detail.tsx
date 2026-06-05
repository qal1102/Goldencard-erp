'use client';

import {
  CalendarIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  EditIcon,
  FileTextIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  UserIcon,
  XCircleIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EditAddressDialog } from '@/components/address/edit-address-dialog';
import { MapLinkButton } from '@/components/address/map-link-button';
import { BackButton } from '@/components/navigation/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GRID_VOLTAGE_LABELS,
  POWER_PHASE_LABELS,
  PROJECT_SCALE_LABELS,
  PROJECT_TYPE_LABELS,
  SYSTEM_TYPE_LABELS,
  type GridVoltage,
  type PowerPhase,
  type ProjectScale,
  type ProjectType,
  type SurveyStatus,
  type SystemType,
  type UpdateSurveyInput,
} from '../schema/survey.schema';
import { computeSurveyAggregates, resolveSurveyZones } from '../lib/survey-aggregates';
import { getSurveyCompletionRequirements } from '../lib/survey-completion-requirements';
import { SurveyCompletionReadinessPanel } from './survey-completion-readiness';
import { buildSurveyFormDefaults } from '../lib/survey-form-defaults';
import { addressesAreSame, buildFullAddress } from '@/lib/address/format-address';
import { useQuotationBySurvey } from '@/modules/quotations/hooks/use-quotations';
import { LeadConsultationContextCard } from '@/modules/crm/components/lead-consultation-context-card';
import type { LeadConsultationContext } from '@/modules/crm/schema/lead.schema';
import {
  useSurvey,
  useTechnicianUsers,
  useUpdateSurvey,
  useUpdateSurveyAddress,
  useUpdateSurveyStatus,
} from '../hooks/use-surveys';
import { SurveyPhotoLinks } from './survey-photo-links';
import { SurveyLocationCheckIn } from './survey-location-check-in';
import { SurveyPinnedLocationInfo } from './survey-pinned-location-info';
import { SurveyAggregationSummary } from './survey-aggregation-summary';
import { SurveyInfrastructureReadCard } from './survey-infrastructure-read-card';
import { SurveyStatusBadge } from './survey-status-badge';
import { SurveyForm } from './survey-form';
import { SurveyZoneBreakdownTable } from './survey-zone-breakdown-table';
import { SurveyZoneReadCard } from './survey-zone-read-card';

type Props = {
  surveyId: string;
  canManage: boolean;
  /** admin/director — may correct survey when an accepted quotation exists */
  canCorrectAcceptedSurvey: boolean;
  isTechnician: boolean;
  userId: string;
  canCreateQuotation: boolean;
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{String(value)}</span>
    </div>
  );
}

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type AssignFeedback = { type: 'success' | 'info'; message: string } | null;
const UNASSIGNED_TECHNICIAN_VALUE = '__unassigned__';

export function SurveyDetail({
  surveyId,
  canManage,
  canCorrectAcceptedSurvey,
  isTechnician,
  userId,
  canCreateQuotation,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [surveyAddressEditOpen, setSurveyAddressEditOpen] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<AssignFeedback>(null);

  const { data: survey, isLoading } = useSurvey(surveyId);
  const { data: technicians } = useTechnicianUsers();
  const updateSurvey = useUpdateSurvey(surveyId);
  const updateSurveyAddress = useUpdateSurveyAddress(surveyId);
  const updateStatus = useUpdateSurveyStatus(surveyId);
  const { data: existingQuotation } = useQuotationBySurvey(surveyId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Không tìm thấy phiếu khảo sát
      </div>
    );
  }

  const status = survey.status as SurveyStatus;
  const isCancelled = status === 'cancelled';
  const isCompleted = status === 'completed';
  const acceptedQuotation = survey.acceptedQuotation ?? null;
  const canFill =
    canManage || (isTechnician && survey.assignedTo === userId);
  const canEditCompleted =
    isCompleted && canFill && (!acceptedQuotation || canCorrectAcceptedSurvey);
  const canEdit = canFill && !isCancelled && (!isCompleted || canEditCompleted);
  const canEditSurveyAddress =
    !isCancelled &&
    (!acceptedQuotation || canCorrectAcceptedSurvey) &&
    (canManage || (isTechnician && survey.assignedTo === userId));
  const canCheckInLocation = canEditSurveyAddress;
  const editLogs = survey.editLogs ?? [];
  const surveyMapCoords = {
    latitude: survey.checkedInLatitude,
    longitude: survey.checkedInLongitude,
  };

  const resolvedZones = resolveSurveyZones(survey);
  const aggregates = computeSurveyAggregates(resolvedZones);
  const completionRequirements = getSurveyCompletionRequirements(survey);
  const hasDbZones = Boolean(survey.zones && survey.zones.length > 0);
  const projectScale = (survey.projectScale ?? 'single') as ProjectScale;
  const projectType = (survey.projectType ?? 'residential') as ProjectType;

  const hasSurveyData =
    resolvedZones.some(
      (z) =>
        z.roofType ||
        z.recommendedSystemKw ||
        z.usableAreaM2 ||
        z.roofMaterial ||
        z.installationDifficulty,
    ) ||
    survey.siteNotes ||
    survey.gridVoltage ||
    survey.systemType ||
    survey.plannedInverterArea ||
    survey.mainCabinetLocation;

  const leadConsultation: LeadConsultationContext | null = survey.lead
    ? {
        customerRequirements: survey.lead.customerRequirements,
        consultationNote: survey.lead.consultationNote,
        preferredInstallTime: survey.lead.preferredInstallTime,
        followUpAt: survey.lead.followUpAt,
        lastCallResult: survey.lead.lastCallResult,
      }
    : null;

  const installationAddress = survey.lead
    ? { address: survey.lead.address, province: survey.lead.province }
    : null;
  const surveyAddress = { address: survey.address, province: survey.province };
  const hasInstallation = Boolean(installationAddress?.address?.trim());
  const addressesMatch =
    hasInstallation && addressesAreSame(surveyAddress, installationAddress!);
  const showBothAddresses = hasInstallation && !addressesMatch;

  const showAssignFeedback = (feedback: AssignFeedback) => {
    setAssignFeedback(feedback);
    setTimeout(() => setAssignFeedback(null), 3000);
  };

  const techSelectValue = survey.assignedTo ?? UNASSIGNED_TECHNICIAN_VALUE;

  const handleAssign = async () => {
    const selectedValue = selectedTechId !== null ? selectedTechId : techSelectValue;
    const submitTechId =
      selectedValue === UNASSIGNED_TECHNICIAN_VALUE ? null : selectedValue || null;
    const currentTechId = survey.assignedTo ?? null;

    if (submitTechId && submitTechId === currentTechId) {
      showAssignFeedback({
        type: 'info',
        message: 'Phiếu này đã được phân công cho kỹ thuật viên này',
      });
      return;
    }

    const result = await updateStatus.mutateAsync({
      status: 'assigned',
      assignedTo: submitTechId,
    });
    if (!result.success) {
      alert(result.error);
    } else {
      setSelectedTechId(null);
      showAssignFeedback({ type: 'success', message: 'Đã phân công kỹ thuật viên' });
    }
  };

  const handleCancel = async () => {
    if (!confirm('Xác nhận hủy phiếu khảo sát này?')) return;
    const result = await updateStatus.mutateAsync({ status: 'cancelled' });
    if (!result.success) alert(result.error);
  };

  const handleComplete = async () => {
    const result = await updateStatus.mutateAsync({ status: 'completed' });
    if (!result.success) alert(result.error);
  };

  const handleFormSubmit = async (data: UpdateSurveyInput) => {
    const result = await updateSurvey.mutateAsync(data);
    if (result.success) {
      setEditMode(false);
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton fallbackHref="/surveys" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-sm font-semibold">{survey.code}</p>
            <SurveyStatusBadge status={status} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {survey.customer?.fullName ?? survey.lead?.fullName}
          </p>
        </div>
      </div>

      {/* Manage actions */}
      {acceptedQuotation && !canCorrectAcceptedSurvey && isCompleted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Báo giá {acceptedQuotation.code} đã được khách chấp nhận — không thể chỉnh sửa khảo
            sát. Liên hệ quản trị viên hoặc giám đốc nếu cần hiệu chỉnh.
          </p>
        </div>
      )}

      {canManage && !isCancelled && !isCompleted && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            {/* Assign technician */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {status === 'pending' ? 'Phân công kỹ thuật viên' : 'Đổi kỹ thuật viên'}
              </Label>
              <div className="flex gap-2">
                <Select
                  value={selectedTechId !== null ? selectedTechId : techSelectValue}
                  onValueChange={(v) =>
                    setSelectedTechId(v ?? UNASSIGNED_TECHNICIAN_VALUE)
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Chọn kỹ thuật viên...">
                      {(value) => {
                        if (value === UNASSIGNED_TECHNICIAN_VALUE) return 'Chưa phân công';
                        const tech = technicians?.find((t) => t.id === value);
                        return tech ? tech.name : 'Chọn kỹ thuật viên...';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_TECHNICIAN_VALUE}>Chưa phân công</SelectItem>
                    {(technicians ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleAssign}
                  disabled={updateStatus.isPending}
                >
                  Phân công
                </Button>
              </div>
              {assignFeedback && (
                <p className={`text-xs ${assignFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {assignFeedback.message}
                </p>
              )}
            </div>

            {/* Cancel */}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleCancel}
              disabled={updateStatus.isPending}
            >
              <XCircleIcon className="size-4" />
              Hủy phiếu
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Technician complete */}
      {isTechnician && !canManage && status === 'assigned' && survey.assignedTo === userId && (
        <div className="flex flex-col gap-2">
          {!completionRequirements.canComplete && (
            <SurveyCompletionReadinessPanel requirements={completionRequirements} />
          )}
          {completionRequirements.canComplete &&
            completionRequirements.warnings.length > 0 && (
              <SurveyCompletionReadinessPanel requirements={completionRequirements} />
            )}
          <Button
            className="w-full"
            onClick={handleComplete}
            disabled={updateStatus.isPending || !completionRequirements.canComplete}
          >
            <CheckCircle2Icon className="size-4" />
            {updateStatus.isPending ? 'Đang lưu...' : 'Đánh dấu hoàn thành'}
          </Button>
        </div>
      )}

      {/* Survey info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ClipboardListIcon className="size-3.5" />
            Thông tin phiếu
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {survey.customer ? (
            <div className="flex items-center gap-2">
              <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <Link
                href={`/crm/customers/${survey.customer.id}`}
                className="text-sm text-primary hover:underline"
              >
                {survey.customer.fullName} ({survey.customer.code})
              </Link>
            </div>
          ) : survey.lead ? (
            <div className="flex items-center gap-2">
              <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <Link
                href={`/crm/leads/${survey.lead.id}`}
                className="text-sm text-primary hover:underline"
              >
                {survey.lead.fullName} ({survey.lead.code})
              </Link>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Khách tiềm năng
              </span>
            </div>
          ) : null}
          {survey.customer && survey.lead && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Lead gốc:</span>
              <Link
                href={`/crm/leads/${survey.lead.id}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {survey.lead.code}
              </Link>
            </div>
          )}
          {showBothAddresses ? (
            <>
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <MapPinIcon className="size-3" />
                    Địa chỉ lắp đặt dự án
                  </p>
                  <MapLinkButton
                    address={installationAddress!.address}
                    province={installationAddress!.province}
                  />
                </div>
                <p className="text-sm">
                  {buildFullAddress(installationAddress!.address, installationAddress!.province)}
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Địa chỉ khảo sát</p>
                  <div className="flex items-center gap-1">
                    <MapLinkButton
                      address={survey.address}
                      province={survey.province}
                      latitude={surveyMapCoords.latitude}
                      longitude={surveyMapCoords.longitude}
                      label="Chỉ đường khảo sát"
                      direction
                    />
                    {canEditSurveyAddress && (
                      <Button variant="ghost" size="sm" onClick={() => setSurveyAddressEditOpen(true)}>
                        <PencilIcon className="size-3.5" />
                        Sửa
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm">{buildFullAddress(survey.address, survey.province)}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">
                  {addressesMatch ? 'Địa chỉ khảo sát' : 'Địa chỉ'}
                </Label>
                <div className="flex items-center gap-1">
                  <MapLinkButton
                    address={survey.address}
                    province={survey.province}
                    latitude={surveyMapCoords.latitude}
                    longitude={surveyMapCoords.longitude}
                    label="Chỉ đường khảo sát"
                    direction
                  />
                  {canEditSurveyAddress && (
                    <Button variant="ghost" size="sm" onClick={() => setSurveyAddressEditOpen(true)}>
                      <PencilIcon className="size-3.5" />
                      Sửa
                    </Button>
                  )}
                </div>
              </div>
              <span className="text-sm">
                {buildFullAddress(survey.address, survey.province) || survey.address}
              </span>
              {addressesMatch && (
                <p className="text-xs text-muted-foreground">Giống địa chỉ lắp đặt</p>
              )}
            </div>
          )}

          <SurveyPinnedLocationInfo
            latitude={survey.checkedInLatitude}
            longitude={survey.checkedInLongitude}
            accuracy={survey.checkedInAccuracyM}
            checkedInAt={survey.checkedInAt}
            checkedInByName={survey.checkedInByUser?.name}
            checkInNote={survey.checkInNote}
          />

          {canCheckInLocation && (
            <SurveyLocationCheckIn surveyId={surveyId} />
          )}

          {survey.scheduledAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="size-3 shrink-0" />
              <span>Ngày hẹn: {formatDate(survey.scheduledAt)}</span>
            </div>
          )}
          {survey.completedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2Icon className="size-3 shrink-0 text-green-600" />
              <span>Hoàn thành: {formatDate(survey.completedAt)}</span>
            </div>
          )}
          {survey.assignedUser && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserIcon className="size-3 shrink-0" />
              <span>Kỹ thuật viên: {survey.assignedUser.name}</span>
            </div>
          )}
          <DetailRow label="Tạo bởi" value={survey.createdByUser?.name} />
        </CardContent>
      </Card>

      {canEditSurveyAddress && (
        <EditAddressDialog
          open={surveyAddressEditOpen}
          onOpenChange={setSurveyAddressEditOpen}
          title="Sửa địa chỉ khảo sát"
          addressFieldLabel="Địa chỉ khảo sát"
          address={survey.address}
          province={survey.province}
          requireEditNote={isCompleted}
          quotationWarning={Boolean(existingQuotation)}
          isPending={updateSurveyAddress.isPending}
          onSubmit={async (data) => {
            const result = await updateSurveyAddress.mutateAsync({
              address: data.address,
              province: data.province,
              editNote: data.editNote,
            });
            return result.success
              ? { success: true }
              : { success: false, error: result.error };
          }}
        />
      )}

      {leadConsultation && (
        <LeadConsultationContextCard consultation={leadConsultation} />
      )}

      {/* Site data — read or edit mode */}
      {!editMode ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Dữ liệu khảo sát</CardTitle>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                    <EditIcon className="size-3.5" />
                    {isCompleted ? 'Hiệu chỉnh' : hasSurveyData ? 'Chỉnh sửa' : 'Nhập liệu'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!hasSurveyData && (
                <p className="text-sm text-muted-foreground">
                  {canEdit
                    ? 'Chưa có dữ liệu khảo sát. Nhấn "Nhập liệu" để bắt đầu.'
                    : 'Chưa có dữ liệu khảo sát.'}
                </p>
              )}

              <DetailRow
                label="Loại công trình"
                value={PROJECT_TYPE_LABELS[projectType]}
              />
              <DetailRow
                label="Quy mô khảo sát"
                value={PROJECT_SCALE_LABELS[projectScale]}
              />

              {(survey.gridVoltage || survey.meterCapacityA || survey.floors) && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Thông tin công trình</p>
                  <DetailRow label="Số tầng" value={survey.floors} />
                  <DetailRow
                    label="Loại điện"
                    value={
                      survey.gridVoltage
                        ? (GRID_VOLTAGE_LABELS[survey.gridVoltage as GridVoltage] ??
                          survey.gridVoltage)
                        : null
                    }
                  />
                  <DetailRow
                    label="CB tổng"
                    value={survey.meterCapacityA ? `${survey.meterCapacityA} A` : null}
                  />
                </div>
              )}

              {survey.siteNotes && <DetailRow label="Ghi chú hiện trường" value={survey.siteNotes} />}
              {survey.photosNote && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Link ảnh/tài liệu khảo sát</Label>
                  <SurveyPhotoLinks value={survey.photosNote} />
                </div>
              )}
              {survey.internalNotes && (
                <DetailRow label="Ghi chú nội bộ" value={survey.internalNotes} />
              )}
            </CardContent>
          </Card>

          {hasSurveyData && (
            <SurveyAggregationSummary
              aggregates={aggregates}
              inverterType={survey.inverterType}
              inverterQuantity={survey.inverterQuantity}
            />
          )}

          {hasSurveyData && resolvedZones.length > 1 && (
            <SurveyZoneBreakdownTable zones={resolvedZones} />
          )}

          {hasSurveyData && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Khu vực lắp đặt</p>
              {resolvedZones.map((zone, index) => (
                <SurveyZoneReadCard
                  key={zone.id}
                  zone={zone}
                  index={index}
                  defaultOpen={index === 0}
                  isLegacy={!hasDbZones}
                />
              ))}
            </div>
          )}

          {(survey.systemType ||
            survey.powerPhase ||
            survey.inverterType ||
            survey.inverterQuantity) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Hệ thống &amp; inverter (dự án)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <DetailRow
                  label="Loại hệ thống"
                  value={
                    survey.systemType
                      ? (SYSTEM_TYPE_LABELS[survey.systemType as SystemType] ?? survey.systemType)
                      : null
                  }
                />
                <DetailRow
                  label="Pha điện"
                  value={
                    survey.powerPhase
                      ? (POWER_PHASE_LABELS[survey.powerPhase as PowerPhase] ?? survey.powerPhase)
                      : null
                  }
                />
                <DetailRow label="Loại inverter" value={survey.inverterType} />
                <DetailRow
                  label="Số lượng inverter"
                  value={
                    survey.inverterQuantity != null ? `${survey.inverterQuantity} bộ` : null
                  }
                />
              </CardContent>
            </Card>
          )}

          <SurveyInfrastructureReadCard survey={survey} />
        </>
      ) : (
        <>
          {leadConsultation && (
            <LeadConsultationContextCard consultation={leadConsultation} />
          )}
          <SurveyForm
            defaultValues={buildSurveyFormDefaults(survey)}
            onSubmit={handleFormSubmit}
            onCancel={() => setEditMode(false)}
            isPending={updateSurvey.isPending}
            requireEditNote={isCompleted}
          />
        </>
      )}

      {editLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lịch sử chỉnh sửa khảo sát</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {editLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0"
              >
                <span className="text-xs text-muted-foreground">
                  {formatDate(log.editedAt)}
                  {log.editedByUser?.name && ` · ${log.editedByUser.name}`}
                </span>
                <p className="text-sm">{log.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed state banner + quotation action */}
      {status === 'completed' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
            <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Khảo sát hoàn thành
              </p>
              {survey.completedAt && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {formatDate(survey.completedAt)}
                </p>
              )}
            </div>
          </div>

          {existingQuotation ? (
            <Button
              variant="outline"
              className="w-full"
              nativeButton={false}
              render={<Link href={`/quotations/${existingQuotation.id}`} />}
            >
              <FileTextIcon className="size-4" />
              Xem báo giá
            </Button>
          ) : canCreateQuotation ? (
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href={`/quotations/new?surveyId=${surveyId}`} />}
            >
              <PlusIcon className="size-4" />
              Tạo báo giá
            </Button>
          ) : null}
        </div>
      )}

      {/* Cancelled state banner */}
      {status === 'cancelled' && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <XCircleIcon className="size-4 shrink-0 text-slate-500" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Phiếu khảo sát đã hủy
          </p>
        </div>
      )}
    </div>
  );
}
