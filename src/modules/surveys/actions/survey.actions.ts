'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { surveyEditLogs, surveyZones, surveys } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { hasRole, requireRole } from '@/lib/auth/roles';
import { safeNotify } from '@/lib/notifications/create-notification';
import {
  notifySurveyAssigned,
  notifySurveyCompleted,
  notifySurveyCorrectedAfterQuotation,
} from '@/lib/notifications/events/survey-events';
import {
  queryAcceptedQuotationBySurveyId,
  queryQuotationsBySurveyId,
} from '@/modules/quotations/lib/quotation.queries';
import { updateSurveyAddressSchema, type UpdateSurveyAddressInput } from '@/lib/address/address.schema';
import {
  type CreateSurveyInput,
  type SurveyFilters,
  type SurveyZoneInput,
  type UpdateSurveyInput,
  type UpdateSurveyStatusInput,
  createSurveySchema,
  surveyFiltersSchema,
  updateSurveySchema,
  updateSurveyStatusSchema,
  checkInSurveyLocationSchema,
  type CheckInSurveyLocationInput,
} from '../schema/survey.schema';
import {
  formatSurveyCompletionBlockedMessage,
  getSurveyCompletionRequirements,
} from '../lib/survey-completion-requirements';
import {
  nextSurveyCode,
  querySurveyById,
  querySurveyDetailById,
  querySurveysByCustomerId,
  querySurveys,
  querySurveysForTechnician,
  queryTechnicianUsers,
} from '../lib/survey.queries';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const SURVEY_MANAGE_ROLES = ['admin', 'director', 'sales', 'project_manager', 'chief_engineer'] as const;
/** When a survey has an accepted quotation, only these roles may correct technical data */
const SURVEY_ACCEPTED_QUOTATION_EDIT_ROLES = ['admin', 'director', 'project_manager', 'chief_engineer'] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

const toNull = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);

const toIntOrNull = (v: string | undefined): number | null => {
  if (v === undefined || v === '' || v === null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};

const toIntOrNullOptional = (v: string | undefined): number | null | undefined => {
  if (v === undefined) return undefined;
  return toIntOrNull(v);
};

function mapZoneToInsert(zone: SurveyZoneInput, surveyId: string, sortOrder: number) {
  return {
    surveyId,
    sortOrder,
    zoneName: zone.zoneName.trim(),
    roofType: toNull(zone.roofType),
    roofMaterial: toNull(zone.roofMaterial),
    usableAreaM2: toNull(zone.usableAreaM2),
    roofOrientation: toNull(zone.roofOrientation),
    roofTiltDeg: toIntOrNull(zone.roofTiltDeg),
    shadingNotes: toNull(zone.shadingNotes),
    roofStructureCondition: toNull(zone.roofStructureCondition),
    needsRoofReinforcement: zone.needsRoofReinforcement ?? false,
    recommendedSystemKw: toNull(zone.recommendedSystemKw),
    panelWattageW: toIntOrNull(zone.panelWattageW) ?? 550,
    recommendedPanelQuantity: toIntOrNull(zone.recommendedPanelQuantity),
    inverterLocation: toNull(zone.inverterLocation),
    cableRouteDistanceM: toIntOrNull(zone.cableRouteDistanceM),
    cableRouteNotes: toNull(zone.cableRouteNotes),
    installationDifficulty: toNull(zone.installationDifficulty),
    extraMaterialsNote: toNull(zone.extraMaterialsNote),
    installationPlanNote: toNull(zone.installationPlanNote),
  };
}

function legacyFieldsFromZone(zone: SurveyZoneInput) {
  return {
    roofType: toNull(zone.roofType),
    roofMaterial: toNull(zone.roofMaterial),
    roofAreaM2: toNull(zone.usableAreaM2),
    roofOrientation: toNull(zone.roofOrientation),
    roofTiltDeg: toIntOrNull(zone.roofTiltDeg),
    shadingNotes: toNull(zone.shadingNotes),
    recommendedSystemKw: toNull(zone.recommendedSystemKw),
    panelWattageW: toIntOrNull(zone.panelWattageW),
    recommendedPanelQuantity: toIntOrNull(zone.recommendedPanelQuantity),
    roofStructureCondition: toNull(zone.roofStructureCondition),
    needsRoofReinforcement: zone.needsRoofReinforcement ?? false,
    inverterLocation: toNull(zone.inverterLocation),
    cableRouteDistanceM: toIntOrNull(zone.cableRouteDistanceM),
    installationDifficulty: toNull(zone.installationDifficulty),
    extraMaterialsNote: toNull(zone.extraMaterialsNote),
    installationPlanNote: toNull(zone.installationPlanNote),
  };
}

export async function createSurveyAction(
  input: CreateSurveyInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...SURVEY_MANAGE_ROLES);

    const parsed = createSurveySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const d = parsed.data;
    const code = await nextSurveyCode();

    const assignedTo = d.assignedTo ?? null;
    const status = assignedTo ? 'assigned' : 'pending';

    const scheduledAt =
      d.scheduledAt && d.scheduledAt.trim() ? new Date(d.scheduledAt) : null;

    const [survey] = await db
      .insert(surveys)
      .values({
        code,
        customerId: d.customerId ?? null,
        leadId: d.leadId ?? null,
        status,
        assignedTo,
        address: d.address,
        province: toNull(d.province),
        scheduledAt,
        internalNotes: toNull(d.notes),
        createdBy: session.user.id,
      })
      .returning({ id: surveys.id, code: surveys.code });

    if (!survey) throw new Error('Không thể tạo phiếu khảo sát');

    if (assignedTo) {
      await safeNotify(() =>
        notifySurveyAssigned({
          surveyId: survey.id,
          surveyCode: survey.code,
          assignedTo,
          actorUserId: session.user.id,
        }),
      );
    }

    revalidatePath('/surveys');
    if (d.customerId) revalidatePath(`/crm/customers/${d.customerId}`);
    if (d.leadId) revalidatePath(`/crm/leads/${d.leadId}`);
    return { success: true, data: { id: survey.id, code: survey.code } };
  } catch (e) {
    console.error('[createSurveyAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getSurveysAction(
  filters: SurveyFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof querySurveys>>>> {
  try {
    const session = await getSessionOrThrow();
    const roles = session.user.roles ?? [];

    const parsed = surveyFiltersSchema.safeParse(filters);
    const safeFilters = parsed.success ? parsed.data : {};

    // Technician sees only their own assigned surveys, with optional status filter
    if (hasRole(roles, 'technician') && !hasRole(roles, ...SURVEY_MANAGE_ROLES)) {
      const data = await querySurveysForTechnician(session.user.id, safeFilters.status);
      return { success: true, data };
    }

    const data = await querySurveys(safeFilters);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getSurveyAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof querySurveyDetailById>>>> {
  try {
    const session = await getSessionOrThrow();
    const sessionRoles = session.user.roles ?? [];

    const data = await querySurveyDetailById(id);

    // Technician can only access surveys assigned to them
    if (
      hasRole(sessionRoles, 'technician') &&
      !hasRole(sessionRoles, ...SURVEY_MANAGE_ROLES)
    ) {
      if (!data || data.assignedTo !== session.user.id) {
        return { success: false, error: 'Không có quyền truy cập phiếu khảo sát này' };
      }
    }

    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getSurveysByCustomerAction(
  customerId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof querySurveysByCustomerId>>>> {
  try {
    await getSessionOrThrow();
    const data = await querySurveysByCustomerId(customerId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateSurveyAction(
  id: string,
  input: UpdateSurveyInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    const sessionRoles = session.user.roles ?? [];

    const parsed = updateSurveySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await querySurveyById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy phiếu khảo sát' };

    if (existing.status === 'cancelled') {
      return { success: false, error: 'Không thể chỉnh sửa phiếu đã hủy' };
    }

    const isCompletedEdit = existing.status === 'completed';
    const acceptedQuotation = await queryAcceptedQuotationBySurveyId(id);

    if (acceptedQuotation) {
      if (!hasRole(sessionRoles, ...SURVEY_ACCEPTED_QUOTATION_EDIT_ROLES)) {
        return {
          success: false,
          error:
            'Phiếu khảo sát đã có báo giá được khách chấp nhận — chỉ quản trị viên hoặc giám đốc mới được chỉnh sửa dữ liệu kỹ thuật',
        };
      }
    }

    // Technician can only update surveys assigned to them
    if (
      hasRole(sessionRoles, 'technician') &&
      !hasRole(sessionRoles, ...SURVEY_MANAGE_ROLES)
    ) {
      if (existing.assignedTo !== session.user.id) {
        return { success: false, error: 'Không có quyền chỉnh sửa phiếu khảo sát này' };
      }
    } else if (!isCompletedEdit) {
      requireRole(sessionRoles, ...SURVEY_MANAGE_ROLES);
    } else if (
      !hasRole(sessionRoles, ...SURVEY_MANAGE_ROLES) &&
      !hasRole(sessionRoles, 'technician')
    ) {
      return { success: false, error: 'Không có quyền chỉnh sửa phiếu khảo sát này' };
    }

    const d = parsed.data;

    if (isCompletedEdit) {
      const editNote = d.editNote?.trim() ?? '';
      if (editNote.length < 5) {
        return {
          success: false,
          error: 'Cần ghi chú lý do chỉnh sửa (ít nhất 5 ký tự) khi sửa phiếu đã hoàn thành',
        };
      }
    }

    const scheduledAt =
      d.scheduledAt !== undefined
        ? d.scheduledAt && d.scheduledAt.trim()
          ? new Date(d.scheduledAt)
          : null
        : undefined;

    const surveyPatch: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (d.address !== undefined) surveyPatch.address = d.address;
    if (d.province !== undefined) surveyPatch.province = toNull(d.province);
    if (scheduledAt !== undefined) surveyPatch.scheduledAt = scheduledAt;
    if (d.projectType !== undefined) surveyPatch.projectType = d.projectType;
    if (d.projectScale !== undefined) surveyPatch.projectScale = d.projectScale;
    if (d.roofType !== undefined) surveyPatch.roofType = toNull(d.roofType);
    if (d.roofMaterial !== undefined) surveyPatch.roofMaterial = toNull(d.roofMaterial);
    if (d.roofAreaM2 !== undefined) surveyPatch.roofAreaM2 = toNull(d.roofAreaM2);
    if (d.roofOrientation !== undefined) surveyPatch.roofOrientation = toNull(d.roofOrientation);
    if (d.roofTiltDeg !== undefined) surveyPatch.roofTiltDeg = toIntOrNullOptional(d.roofTiltDeg);
    if (d.shadingNotes !== undefined) surveyPatch.shadingNotes = toNull(d.shadingNotes);
    if (d.floors !== undefined) surveyPatch.floors = toIntOrNullOptional(d.floors);
    if (d.meterCapacityA !== undefined) {
      surveyPatch.meterCapacityA = toIntOrNullOptional(d.meterCapacityA);
    }
    if (d.gridVoltage !== undefined) surveyPatch.gridVoltage = toNull(d.gridVoltage);
    if (d.siteNotes !== undefined) surveyPatch.siteNotes = toNull(d.siteNotes);
    if (d.internalNotes !== undefined) surveyPatch.internalNotes = toNull(d.internalNotes);
    if (d.photosNote !== undefined) surveyPatch.photosNote = toNull(d.photosNote);
    if (d.recommendedSystemKw !== undefined) {
      surveyPatch.recommendedSystemKw = toNull(d.recommendedSystemKw);
    }
    if (d.panelWattageW !== undefined) surveyPatch.panelWattageW = toIntOrNullOptional(d.panelWattageW);
    if (d.recommendedPanelQuantity !== undefined) {
      surveyPatch.recommendedPanelQuantity = toIntOrNullOptional(d.recommendedPanelQuantity);
    }
    if (d.inverterType !== undefined) surveyPatch.inverterType = toNull(d.inverterType);
    if (d.inverterQuantity !== undefined) {
      surveyPatch.inverterQuantity = toIntOrNullOptional(d.inverterQuantity);
    }
    if (d.systemType !== undefined) surveyPatch.systemType = toNull(d.systemType);
    if (d.powerPhase !== undefined) surveyPatch.powerPhase = toNull(d.powerPhase);
    if (d.roofStructureCondition !== undefined) {
      surveyPatch.roofStructureCondition = toNull(d.roofStructureCondition);
    }
    if (d.needsRoofReinforcement !== undefined) {
      surveyPatch.needsRoofReinforcement = d.needsRoofReinforcement;
    }
    if (d.inverterLocation !== undefined) surveyPatch.inverterLocation = toNull(d.inverterLocation);
    if (d.cableRouteDistanceM !== undefined) {
      surveyPatch.cableRouteDistanceM = toIntOrNullOptional(d.cableRouteDistanceM);
    }
    if (d.mainBreakerCapacityA !== undefined) {
      surveyPatch.mainBreakerCapacityA = toIntOrNullOptional(d.mainBreakerCapacityA);
    }
    if (d.mainElectricalCabinetCondition !== undefined) {
      surveyPatch.mainElectricalCabinetCondition = toNull(d.mainElectricalCabinetCondition);
    }
    if (d.needsElectricalCabinetUpgrade !== undefined) {
      surveyPatch.needsElectricalCabinetUpgrade = d.needsElectricalCabinetUpgrade;
    }
    if (d.hasGrounding !== undefined) surveyPatch.hasGrounding = d.hasGrounding;
    if (d.installationDifficulty !== undefined) {
      surveyPatch.installationDifficulty = toNull(d.installationDifficulty);
    }
    if (d.extraMaterialsNote !== undefined) {
      surveyPatch.extraMaterialsNote = toNull(d.extraMaterialsNote);
    }
    if (d.installationPlanNote !== undefined) {
      surveyPatch.installationPlanNote = toNull(d.installationPlanNote);
    }
    if (d.plannedInverterArea !== undefined) {
      surveyPatch.plannedInverterArea = toNull(d.plannedInverterArea);
    }
    if (d.inverterAreaNearMainPower !== undefined) {
      surveyPatch.inverterAreaNearMainPower = d.inverterAreaNearMainPower;
    }
    if (d.inverterAreaDistanceToMainCabinetM !== undefined) {
      surveyPatch.inverterAreaDistanceToMainCabinetM = toIntOrNullOptional(
        d.inverterAreaDistanceToMainCabinetM,
      );
    }
    if (d.inverterAreaCleanDryVentilated !== undefined) {
      surveyPatch.inverterAreaCleanDryVentilated = d.inverterAreaCleanDryVentilated;
    }
    if (d.inverterAreaHasShelter !== undefined) {
      surveyPatch.inverterAreaHasShelter = d.inverterAreaHasShelter;
    }
    if (d.inverterAreaRiskNotes !== undefined) {
      surveyPatch.inverterAreaRiskNotes = toNull(d.inverterAreaRiskNotes);
    }
    if (d.needsInverterShelterOrRack !== undefined) {
      surveyPatch.needsInverterShelterOrRack = d.needsInverterShelterOrRack;
    }
    if (d.mainPowerConnectionPoint !== undefined) {
      surveyPatch.mainPowerConnectionPoint = toNull(d.mainPowerConnectionPoint);
    }
    if (d.mainCabinetLocation !== undefined) {
      surveyPatch.mainCabinetLocation = toNull(d.mainCabinetLocation);
    }
    if (d.groundingLocation !== undefined) {
      surveyPatch.groundingLocation = toNull(d.groundingLocation);
    }
    if (d.mainCableRouteNotes !== undefined) {
      surveyPatch.mainCableRouteNotes = toNull(d.mainCableRouteNotes);
    }
    if (d.maintenanceAccessNotes !== undefined) {
      surveyPatch.maintenanceAccessNotes = toNull(d.maintenanceAccessNotes);
    }
    if (d.fireSafetyNotes !== undefined) {
      surveyPatch.fireSafetyNotes = toNull(d.fireSafetyNotes);
    }
    if (d.generalTechnicalRiskNotes !== undefined) {
      surveyPatch.generalTechnicalRiskNotes = toNull(d.generalTechnicalRiskNotes);
    }

    if (d.zones !== undefined) {
      const effectiveScale = d.projectScale ?? existing.projectScale ?? 'single';
      surveyPatch.projectScale = effectiveScale;
      if (effectiveScale === 'single' && d.zones.length === 1) {
        Object.assign(surveyPatch, legacyFieldsFromZone(d.zones[0]));
      }
    }

    const now = surveyPatch.updatedAt as Date;
    const beforeStatus = existing.status;

    await db.transaction(async (tx) => {
      await tx.update(surveys).set(surveyPatch).where(eq(surveys.id, id));

      if (d.zones !== undefined) {
        await tx.delete(surveyZones).where(eq(surveyZones.surveyId, id));
        if (d.zones.length > 0) {
          await tx.insert(surveyZones).values(
            d.zones.map((zone, index) => mapZoneToInsert(zone, id, index)),
          );
        }
      }

      if (isCompletedEdit) {
        await tx.insert(surveyEditLogs).values({
          surveyId: id,
          editedBy: session.user.id,
          editedAt: now,
          note: d.editNote!.trim(),
          beforeStatus,
          afterStatus: beforeStatus,
        });
      }
    });

    if (isCompletedEdit) {
      await createAuditLog({
        userId: session.user.id,
        action: 'survey.correct',
        resource: 'survey',
        resourceId: id,
        summary: d.editNote!.trim(),
        before: { status: beforeStatus, code: existing.code },
        after: { status: beforeStatus, code: existing.code },
      });

      const linkedQuotations = await queryQuotationsBySurveyId(id);
      if (linkedQuotations.length > 0) {
        const primaryQuotation = linkedQuotations[0];
        await safeNotify(() =>
          notifySurveyCorrectedAfterQuotation({
            surveyId: id,
            surveyCode: existing.code,
            leadId: existing.leadId,
            quotationId: primaryQuotation.id,
            quotationCreatedBy: primaryQuotation.createdBy,
            actorUserId: session.user.id,
          }),
        );
      }
    }

    revalidatePath('/surveys');
    revalidatePath(`/surveys/${id}`);
    revalidatePath('/quotations');
    const linkedQuotations = await queryQuotationsBySurveyId(id);
    for (const q of linkedQuotations) {
      revalidatePath(`/quotations/${q.id}`);
    }
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateSurveyAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateSurveyAddressAction(
  id: string,
  input: UpdateSurveyAddressInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    const sessionRoles = session.user.roles ?? [];

    const parsed = updateSurveyAddressSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await querySurveyById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy phiếu khảo sát' };

    if (existing.status === 'cancelled') {
      return { success: false, error: 'Không thể chỉnh sửa phiếu đã hủy' };
    }

    const acceptedQuotation = await queryAcceptedQuotationBySurveyId(id);
    if (acceptedQuotation) {
      if (!hasRole(sessionRoles, ...SURVEY_ACCEPTED_QUOTATION_EDIT_ROLES)) {
        return {
          success: false,
          error:
            'Phiếu khảo sát đã có báo giá được khách chấp nhận — chỉ quản trị viên hoặc giám đốc mới được chỉnh sửa',
        };
      }
    }

    const isCompletedEdit = existing.status === 'completed';
    const isTech =
      hasRole(sessionRoles, 'technician') &&
      !hasRole(sessionRoles, ...SURVEY_MANAGE_ROLES);

    if (isTech) {
      if (existing.assignedTo !== session.user.id) {
        return { success: false, error: 'Không có quyền chỉnh sửa phiếu khảo sát này' };
      }
    } else if (!isCompletedEdit) {
      requireRole(sessionRoles, ...SURVEY_MANAGE_ROLES);
    } else if (
      !hasRole(sessionRoles, ...SURVEY_MANAGE_ROLES) &&
      !hasRole(sessionRoles, 'technician')
    ) {
      return { success: false, error: 'Không có quyền chỉnh sửa phiếu khảo sát này' };
    }

    const d = parsed.data;

    if (isCompletedEdit) {
      const editNote = d.editNote?.trim() ?? '';
      if (editNote.length < 5) {
        return {
          success: false,
          error: 'Cần ghi chú lý do chỉnh sửa (ít nhất 5 ký tự) khi sửa phiếu đã hoàn thành',
        };
      }
    }

    const newProvince = toNull(d.province);
    const now = new Date();
    const beforeStatus = existing.status;
    const summary = `Cập nhật địa chỉ khảo sát: ${d.address}${newProvince ? `, ${newProvince}` : ''}`;

    await db.transaction(async (tx) => {
      await tx
        .update(surveys)
        .set({
          address: d.address,
          province: newProvince,
          updatedAt: now,
        })
        .where(eq(surveys.id, id));

      if (isCompletedEdit) {
        await tx.insert(surveyEditLogs).values({
          surveyId: id,
          editedBy: session.user.id,
          editedAt: now,
          note: d.editNote!.trim(),
          beforeStatus,
          afterStatus: beforeStatus,
        });
      }
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'survey.address.update',
      resource: 'survey',
      resourceId: id,
      summary: isCompletedEdit ? `${summary} — ${d.editNote!.trim()}` : summary,
      before: { address: existing.address, province: existing.province },
      after: { address: d.address, province: newProvince },
    });

    if (isCompletedEdit) {
      const linkedQuotations = await queryQuotationsBySurveyId(id);
      if (linkedQuotations.length > 0) {
        const primaryQuotation = linkedQuotations[0];
        await safeNotify(() =>
          notifySurveyCorrectedAfterQuotation({
            surveyId: id,
            surveyCode: existing.code,
            leadId: existing.leadId,
            quotationId: primaryQuotation.id,
            quotationCreatedBy: primaryQuotation.createdBy,
            actorUserId: session.user.id,
          }),
        );
      }
    }

    revalidatePath('/surveys');
    revalidatePath(`/surveys/${id}`);
    revalidatePath('/quotations');
    const linkedQuotations = await queryQuotationsBySurveyId(id);
    for (const q of linkedQuotations) {
      revalidatePath(`/quotations/${q.id}`);
    }
    if (existing.customerId) {
      revalidatePath(`/crm/customers/${existing.customerId}`);
    }
    if (existing.leadId) {
      revalidatePath(`/crm/leads/${existing.leadId}`);
    }

    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateSurveyAddressAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function checkInSurveyLocationAction(
  id: string,
  input: CheckInSurveyLocationInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    const sessionRoles = session.user.roles ?? [];

    const parsed = checkInSurveyLocationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await querySurveyById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy phiếu khảo sát' };

    if (existing.status === 'cancelled') {
      return { success: false, error: 'Không thể ghim vị trí cho phiếu đã hủy' };
    }

    const acceptedQuotation = await queryAcceptedQuotationBySurveyId(id);
    if (acceptedQuotation) {
      if (!hasRole(sessionRoles, ...SURVEY_ACCEPTED_QUOTATION_EDIT_ROLES)) {
        return {
          success: false,
          error:
            'Phiếu khảo sát đã có báo giá được khách chấp nhận — chỉ quản trị viên hoặc giám đốc mới được chỉnh sửa',
        };
      }
    }

    const isTech =
      hasRole(sessionRoles, 'technician') &&
      !hasRole(sessionRoles, ...SURVEY_MANAGE_ROLES);

    if (isTech) {
      if (existing.assignedTo !== session.user.id) {
        return { success: false, error: 'Không có quyền ghim vị trí phiếu khảo sát này' };
      }
    } else {
      requireRole(sessionRoles, ...SURVEY_MANAGE_ROLES);
    }

    const d = parsed.data;
    const now = new Date();
    const note = toNull(d.note);

    await db
      .update(surveys)
      .set({
        checkedInLatitude: String(d.latitude),
        checkedInLongitude: String(d.longitude),
        checkedInAccuracyM: d.accuracy != null ? String(d.accuracy) : null,
        checkedInAt: now,
        checkedInBy: session.user.id,
        checkInNote: note,
        updatedAt: now,
      })
      .where(eq(surveys.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'survey.location.check_in',
      resource: 'survey',
      resourceId: id,
      summary: 'Kỹ thuật viên ghim vị trí khảo sát thực tế',
      before: {
        checkedInLatitude: existing.checkedInLatitude,
        checkedInLongitude: existing.checkedInLongitude,
      },
      after: {
        checkedInLatitude: String(d.latitude),
        checkedInLongitude: String(d.longitude),
        checkedInAccuracyM: d.accuracy ?? null,
        checkInNote: note,
      },
    });

    revalidatePath('/surveys');
    revalidatePath(`/surveys/${id}`);
    if (existing.customerId) {
      revalidatePath(`/crm/customers/${existing.customerId}`);
    }
    if (existing.leadId) {
      revalidatePath(`/crm/leads/${existing.leadId}`);
    }

    return { success: true, data: undefined };
  } catch (e) {
    console.error('[checkInSurveyLocationAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateSurveyStatusAction(
  id: string,
  input: UpdateSurveyStatusInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    const sessionRoles = session.user.roles ?? [];

    const parsed = updateSurveyStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await querySurveyById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy phiếu khảo sát' };

    const { status, assignedTo } = parsed.data;
    const isTech =
      hasRole(sessionRoles, 'technician') &&
      !hasRole(sessionRoles, ...SURVEY_MANAGE_ROLES);

    if (isTech) {
      if (existing.assignedTo !== session.user.id) {
        return { success: false, error: 'Không có quyền cập nhật phiếu này' };
      }
      if (status !== 'completed') {
        return {
          success: false,
          error: 'Kỹ thuật viên chỉ có thể đánh dấu hoàn thành',
        };
      }
    } else {
      requireRole(sessionRoles, ...SURVEY_MANAGE_ROLES);
    }

    if (status === 'completed') {
      if (existing.status !== 'assigned') {
        return {
          success: false,
          error: 'Chỉ có thể hoàn thành phiếu ở trạng thái đã phân công',
        };
      }
      const completionReq = getSurveyCompletionRequirements(existing, {
        requireAssignedStatus: true,
      });
      if (!completionReq.canComplete) {
        return {
          success: false,
          error: formatSurveyCompletionBlockedMessage(completionReq),
        };
      }
    }

    const now = new Date();
    const updates: Record<string, unknown> = { status, updatedAt: now };

    if (status === 'completed') updates.completedAt = now;
    if ((status === 'assigned' || status === 'pending') && assignedTo !== undefined) {
      updates.assignedTo = assignedTo;
    }
    if (status === 'pending') updates.completedAt = null;

    await db.update(surveys).set(updates).where(eq(surveys.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: `survey.status.${status}`,
      resource: 'survey',
      resourceId: id,
      summary:
        status === 'assigned'
          ? assignedTo
            ? `Phân công phiếu khảo sát ${existing.code}`
            : `Gỡ phân công phiếu khảo sát ${existing.code}`
          : status === 'completed'
            ? `Xác nhận hoàn thành khảo sát ${existing.code}`
            : status === 'cancelled'
              ? `Hủy phiếu khảo sát ${existing.code}`
              : `Cập nhật trạng thái khảo sát ${existing.code}`,
      before: { status: existing.status, assignedTo: existing.assignedTo },
      after: { status, assignedTo: assignedTo === undefined ? existing.assignedTo : assignedTo },
    });

    if (status === 'assigned' && assignedTo) {
      await safeNotify(() =>
        notifySurveyAssigned({
          surveyId: id,
          surveyCode: existing.code,
          assignedTo,
          actorUserId: session.user.id,
        }),
      );
    }

    if (status === 'completed') {
      await safeNotify(() =>
        notifySurveyCompleted({
          surveyId: id,
          surveyCode: existing.code,
          leadId: existing.leadId,
          actorUserId: session.user.id,
        }),
      );
    }

    revalidatePath('/surveys');
    revalidatePath(`/surveys/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateSurveyStatusAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getTechnicianUsersAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof queryTechnicianUsers>>>
> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...SURVEY_MANAGE_ROLES);
    const data = await queryTechnicianUsers();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
