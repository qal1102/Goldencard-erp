'use client';

import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  EditIcon,
  FileTextIcon,
  PlusIcon,
  UserIcon,
  XCircleIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
  INSTALLATION_DIFFICULTY_LABELS,
  POWER_PHASE_LABELS,
  ROOF_TYPE_LABELS,
  SYSTEM_TYPE_LABELS,
  type GridVoltage,
  type InstallationDifficulty,
  type PowerPhase,
  type RoofType,
  type SurveyStatus,
  type SystemType,
  type UpdateSurveyInput,
} from '../schema/survey.schema';
import { useQuotationBySurvey } from '@/modules/quotations/hooks/use-quotations';
import { useSurvey, useTechnicianUsers, useUpdateSurvey, useUpdateSurveyStatus } from '../hooks/use-surveys';
import { SurveyStatusBadge } from './survey-status-badge';
import { SurveyForm } from './survey-form';

type Props = {
  surveyId: string;
  canManage: boolean;
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

function toDatetimeLocalValue(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type AssignFeedback = { type: 'success' | 'info'; message: string } | null;

export function SurveyDetail({ surveyId, canManage, isTechnician, userId, canCreateQuotation }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<AssignFeedback>(null);

  const { data: survey, isLoading } = useSurvey(surveyId);
  const { data: technicians } = useTechnicianUsers();
  const updateSurvey = useUpdateSurvey(surveyId);
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
  const isTerminal = status === 'completed' || status === 'cancelled';
  const canFill =
    canManage || (isTechnician && survey.assignedTo === userId);
  const canEdit = canFill && !isTerminal;

  const showAssignFeedback = (feedback: AssignFeedback) => {
    setAssignFeedback(feedback);
    setTimeout(() => setAssignFeedback(null), 3000);
  };

  const techSelectValue = survey.assignedTo ?? '';

  const handleAssign = async () => {
    const submitTechId =
      (selectedTechId !== null ? selectedTechId : techSelectValue) || null;
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
        <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/surveys" />}>
          <ArrowLeftIcon className="size-4" />
        </Button>
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
      {canManage && !isTerminal && (
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
                  onValueChange={(v) => setSelectedTechId(v ?? '')}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Chọn kỹ thuật viên...">
                      {(value) => {
                        const tech = technicians?.find((t) => t.id === value);
                        return tech ? tech.name : 'Chọn kỹ thuật viên...';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Chưa phân công</SelectItem>
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

      {/* Technician complete button */}
      {isTechnician && !canManage && status === 'assigned' && survey.assignedTo === userId && (
        <Button
          className="w-full"
          onClick={handleComplete}
          disabled={updateStatus.isPending}
        >
          <CheckCircle2Icon className="size-4" />
          {updateStatus.isPending ? 'Đang lưu...' : 'Đánh dấu hoàn thành'}
        </Button>
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
          <DetailRow label="Địa chỉ" value={survey.address} />
          <DetailRow label="Tỉnh/TP" value={survey.province} />
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

      {/* Site data — read or edit mode */}
      {!editMode ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Dữ liệu khảo sát</CardTitle>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                  >
                    <EditIcon className="size-3.5" />
                    {survey.siteNotes || survey.roofType ? 'Chỉnh sửa' : 'Nhập liệu'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!survey.roofType &&
                !survey.siteNotes &&
                !survey.meterCapacityA &&
                !survey.floors &&
                !survey.recommendedSystemKw && (
                  <p className="text-sm text-muted-foreground">
                    {canEdit
                      ? 'Chưa có dữ liệu khảo sát. Nhấn "Nhập liệu" để bắt đầu.'
                      : 'Chưa có dữ liệu khảo sát.'}
                  </p>
                )}

              {/* Roof */}
              {(survey.roofType || survey.roofMaterial || survey.roofAreaM2 || survey.roofOrientation) && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Mái nhà</p>
                  <DetailRow
                    label="Loại mái"
                    value={
                      survey.roofType
                        ? (ROOF_TYPE_LABELS[survey.roofType as RoofType] ?? survey.roofType)
                        : null
                    }
                  />
                  <DetailRow label="Vật liệu" value={survey.roofMaterial} />
                  <DetailRow label="Diện tích" value={survey.roofAreaM2 ? `${survey.roofAreaM2} m²` : null} />
                  <DetailRow label="Hướng mái" value={survey.roofOrientation} />
                  <DetailRow label="Độ dốc" value={survey.roofTiltDeg != null ? `${survey.roofTiltDeg}°` : null} />
                  <DetailRow label="Số tầng" value={survey.floors} />
                  <DetailRow label="Bóng che" value={survey.shadingNotes} />
                </div>
              )}

              {/* Electrical */}
              {(survey.gridVoltage || survey.meterCapacityA) && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Hệ thống điện</p>
                  <DetailRow
                    label="Loại điện"
                    value={
                      survey.gridVoltage
                        ? (GRID_VOLTAGE_LABELS[survey.gridVoltage as GridVoltage] ?? survey.gridVoltage)
                        : null
                    }
                  />
                  <DetailRow label="CB tổng" value={survey.meterCapacityA ? `${survey.meterCapacityA} A` : null} />
                </div>
              )}

              {/* Notes */}
              {survey.siteNotes && (
                <DetailRow label="Ghi chú hiện trường" value={survey.siteNotes} />
              )}
              {survey.photosNote && (
                <DetailRow label="Ảnh hiện trường" value={survey.photosNote} />
              )}
              {survey.internalNotes && (
                <DetailRow label="Ghi chú nội bộ" value={survey.internalNotes} />
              )}
            </CardContent>
          </Card>

          {/* Technical Proposal */}
          {(survey.recommendedSystemKw ||
            survey.systemType ||
            survey.inverterType ||
            survey.installationDifficulty) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Đề xuất kỹ thuật &amp; vật tư</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {/* System sizing */}
                {(survey.recommendedSystemKw ||
                  survey.panelWattageW ||
                  survey.recommendedPanelQuantity) && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Hệ thống</p>
                    <DetailRow
                      label="Công suất hệ thống"
                      value={
                        survey.recommendedSystemKw ? `${survey.recommendedSystemKw} kWp` : null
                      }
                    />
                    <DetailRow
                      label="Công suất tấm pin"
                      value={survey.panelWattageW ? `${survey.panelWattageW} W/tấm` : null}
                    />
                    <DetailRow
                      label="Số tấm pin"
                      value={
                        survey.recommendedPanelQuantity
                          ? `${survey.recommendedPanelQuantity} tấm`
                          : null
                      }
                    />
                    <DetailRow
                      label="Loại hệ thống"
                      value={
                        survey.systemType
                          ? (SYSTEM_TYPE_LABELS[survey.systemType as SystemType] ??
                            survey.systemType)
                          : null
                      }
                    />
                    <DetailRow
                      label="Pha điện"
                      value={
                        survey.powerPhase
                          ? (POWER_PHASE_LABELS[survey.powerPhase as PowerPhase] ??
                            survey.powerPhase)
                          : null
                      }
                    />
                  </div>
                )}

                {/* Inverter */}
                {(survey.inverterType || survey.inverterQuantity || survey.inverterLocation) && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Inverter</p>
                    <DetailRow label="Loại inverter" value={survey.inverterType} />
                    <DetailRow
                      label="Số lượng"
                      value={survey.inverterQuantity != null ? `${survey.inverterQuantity} bộ` : null}
                    />
                    <DetailRow label="Vị trí lắp" value={survey.inverterLocation} />
                  </div>
                )}

                {/* Roof & electrical */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Thi công</p>
                  {survey.roofStructureCondition && (
                    <DetailRow
                      label="Kết cấu mái"
                      value={survey.roofStructureCondition}
                    />
                  )}
                  <DetailRow
                    label="Gia cố mái"
                    value={
                      survey.needsRoofReinforcement != null
                        ? survey.needsRoofReinforcement
                          ? 'Cần gia cố'
                          : 'Không cần'
                        : null
                    }
                  />
                  <DetailRow
                    label="Khoảng cách đi dây"
                    value={
                      survey.cableRouteDistanceM != null
                        ? `${survey.cableRouteDistanceM} m`
                        : null
                    }
                  />
                  <DetailRow
                    label="CB chính"
                    value={
                      survey.mainBreakerCapacityA != null
                        ? `${survey.mainBreakerCapacityA} A`
                        : null
                    }
                  />
                  {survey.mainElectricalCabinetCondition && (
                    <DetailRow
                      label="Tủ điện chính"
                      value={survey.mainElectricalCabinetCondition}
                    />
                  )}
                  <DetailRow
                    label="Nâng cấp tủ điện"
                    value={
                      survey.needsElectricalCabinetUpgrade != null
                        ? survey.needsElectricalCabinetUpgrade
                          ? 'Cần nâng cấp'
                          : 'Không cần'
                        : null
                    }
                  />
                  <DetailRow
                    label="Tiếp địa"
                    value={
                      survey.hasGrounding != null
                        ? survey.hasGrounding
                          ? 'Đã có'
                          : 'Chưa có'
                        : null
                    }
                  />
                  <DetailRow
                    label="Độ khó thi công"
                    value={
                      survey.installationDifficulty
                        ? (INSTALLATION_DIFFICULTY_LABELS[
                            survey.installationDifficulty as InstallationDifficulty
                          ] ?? survey.installationDifficulty)
                        : null
                    }
                  />
                </div>

                {survey.extraMaterialsNote && (
                  <DetailRow label="Vật tư phụ" value={survey.extraMaterialsNote} />
                )}
                {survey.installationPlanNote && (
                  <DetailRow label="Kế hoạch thi công" value={survey.installationPlanNote} />
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <SurveyForm
          defaultValues={{
            address: survey.address,
            province: survey.province ?? '',
            scheduledAt: toDatetimeLocalValue(survey.scheduledAt),
            roofType: (survey.roofType as RoofType | undefined) ?? undefined,
            roofMaterial: survey.roofMaterial ?? '',
            roofAreaM2: survey.roofAreaM2 ?? '',
            roofOrientation: survey.roofOrientation ?? '',
            roofTiltDeg: survey.roofTiltDeg != null ? String(survey.roofTiltDeg) : '',
            shadingNotes: survey.shadingNotes ?? '',
            floors: survey.floors != null ? String(survey.floors) : '',
            meterCapacityA: survey.meterCapacityA != null ? String(survey.meterCapacityA) : '',
            gridVoltage: (survey.gridVoltage as GridVoltage | undefined) ?? undefined,
            siteNotes: survey.siteNotes ?? '',
            internalNotes: survey.internalNotes ?? '',
            photosNote: survey.photosNote ?? '',
            // Technical proposal fields
            recommendedSystemKw: survey.recommendedSystemKw ?? '',
            panelWattageW:
              survey.panelWattageW != null ? String(survey.panelWattageW) : '550',
            recommendedPanelQuantity:
              survey.recommendedPanelQuantity != null
                ? String(survey.recommendedPanelQuantity)
                : '',
            inverterType: survey.inverterType ?? '',
            inverterQuantity:
              survey.inverterQuantity != null ? String(survey.inverterQuantity) : '1',
            systemType: (survey.systemType as UpdateSurveyInput['systemType']) ?? undefined,
            powerPhase: (survey.powerPhase as UpdateSurveyInput['powerPhase']) ?? undefined,
            roofStructureCondition: survey.roofStructureCondition ?? '',
            needsRoofReinforcement: survey.needsRoofReinforcement ?? false,
            inverterLocation: survey.inverterLocation ?? '',
            cableRouteDistanceM:
              survey.cableRouteDistanceM != null ? String(survey.cableRouteDistanceM) : '',
            mainBreakerCapacityA:
              survey.mainBreakerCapacityA != null ? String(survey.mainBreakerCapacityA) : '',
            mainElectricalCabinetCondition: survey.mainElectricalCabinetCondition ?? '',
            needsElectricalCabinetUpgrade: survey.needsElectricalCabinetUpgrade ?? false,
            hasGrounding: survey.hasGrounding ?? false,
            installationDifficulty:
              (survey.installationDifficulty as UpdateSurveyInput['installationDifficulty']) ??
              undefined,
            extraMaterialsNote: survey.extraMaterialsNote ?? '',
            installationPlanNote: survey.installationPlanNote ?? '',
          }}
          onSubmit={handleFormSubmit}
          onCancel={() => setEditMode(false)}
          isPending={updateSurvey.isPending}
        />
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
