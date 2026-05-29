'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { surveys } from '@/db/schema';
import { hasRole, requireRole } from '@/lib/auth/roles';
import {
  type CreateSurveyInput,
  type SurveyFilters,
  type UpdateSurveyInput,
  type UpdateSurveyStatusInput,
  createSurveySchema,
  surveyFiltersSchema,
  updateSurveySchema,
  updateSurveyStatusSchema,
} from '../schema/survey.schema';
import {
  nextSurveyCode,
  querySurveyById,
  querySurveysByCustomerId,
  querySurveys,
  querySurveysForTechnician,
  queryTechnicianUsers,
} from '../lib/survey.queries';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const SURVEY_MANAGE_ROLES = ['admin', 'director', 'sales'] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

const toNull = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);

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
        customerId: d.customerId,
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

    revalidatePath('/surveys');
    revalidatePath(`/crm/customers/${d.customerId}`);
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
    if (hasRole(roles, 'technician') && !hasRole(roles, 'admin', 'director', 'sales')) {
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
): Promise<ActionResult<Awaited<ReturnType<typeof querySurveyById>>>> {
  try {
    const session = await getSessionOrThrow();
    const sessionRoles = session.user.roles ?? [];

    const data = await querySurveyById(id);

    // Technician can only access surveys assigned to them
    if (
      hasRole(sessionRoles, 'technician') &&
      !hasRole(sessionRoles, 'admin', 'director', 'sales')
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

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return { success: false, error: 'Không thể chỉnh sửa phiếu đã hoàn thành hoặc đã hủy' };
    }

    // Technician can only update surveys assigned to them
    if (
      hasRole(sessionRoles, 'technician') &&
      !hasRole(sessionRoles, 'admin', 'director', 'sales')
    ) {
      if (existing.assignedTo !== session.user.id) {
        return { success: false, error: 'Không có quyền chỉnh sửa phiếu khảo sát này' };
      }
    } else {
      // Must be admin/director/sales
      requireRole(sessionRoles, ...SURVEY_MANAGE_ROLES);
    }

    const d = parsed.data;

    const scheduledAt =
      d.scheduledAt !== undefined
        ? d.scheduledAt && d.scheduledAt.trim()
          ? new Date(d.scheduledAt)
          : null
        : undefined;

    const toIntOrNull = (v: string | undefined): number | null | undefined => {
      if (v === undefined) return undefined;
      if (v === '' || v === null) return null;
      const n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    };

    await db
      .update(surveys)
      .set({
        ...(d.address !== undefined && { address: d.address }),
        ...(d.province !== undefined && { province: toNull(d.province) }),
        ...(scheduledAt !== undefined && { scheduledAt }),
        ...(d.roofType !== undefined && { roofType: toNull(d.roofType) }),
        ...(d.roofMaterial !== undefined && { roofMaterial: toNull(d.roofMaterial) }),
        ...(d.roofAreaM2 !== undefined && { roofAreaM2: toNull(d.roofAreaM2) }),
        ...(d.roofOrientation !== undefined && { roofOrientation: toNull(d.roofOrientation) }),
        ...(d.roofTiltDeg !== undefined && { roofTiltDeg: toIntOrNull(d.roofTiltDeg) }),
        ...(d.shadingNotes !== undefined && { shadingNotes: toNull(d.shadingNotes) }),
        ...(d.floors !== undefined && { floors: toIntOrNull(d.floors) }),
        ...(d.meterCapacityA !== undefined && { meterCapacityA: toIntOrNull(d.meterCapacityA) }),
        ...(d.gridVoltage !== undefined && { gridVoltage: toNull(d.gridVoltage) }),
        ...(d.siteNotes !== undefined && { siteNotes: toNull(d.siteNotes) }),
        ...(d.internalNotes !== undefined && { internalNotes: toNull(d.internalNotes) }),
        ...(d.photosNote !== undefined && { photosNote: toNull(d.photosNote) }),
        updatedAt: new Date(),
      })
      .where(eq(surveys.id, id));

    revalidatePath('/surveys');
    revalidatePath(`/surveys/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateSurveyAction]', e);
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
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await querySurveyById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy phiếu khảo sát' };

    const { status, assignedTo } = parsed.data;
    const isTech =
      hasRole(sessionRoles, 'technician') &&
      !hasRole(sessionRoles, 'admin', 'director', 'sales');

    if (isTech) {
      // Technician can only mark their own assigned survey as completed
      if (existing.assignedTo !== session.user.id) {
        return { success: false, error: 'Không có quyền cập nhật phiếu này' };
      }
      if (status !== 'completed') {
        return { success: false, error: 'Kỹ thuật viên chỉ có thể đánh dấu hoàn thành' };
      }
      if (existing.status !== 'assigned') {
        return {
          success: false,
          error: 'Chỉ có thể hoàn thành phiếu ở trạng thái đã phân công',
        };
      }
    } else {
      requireRole(sessionRoles, ...SURVEY_MANAGE_ROLES);
      if (status === 'completed') {
        return { success: false, error: 'Chỉ kỹ thuật viên mới có thể đánh dấu hoàn thành' };
      }
    }

    const now = new Date();
    const updates: Record<string, unknown> = { status, updatedAt: now };

    if (status === 'completed') updates.completedAt = now;
    if (status === 'assigned' && assignedTo !== undefined) {
      updates.assignedTo = assignedTo;
    }

    await db.update(surveys).set(updates).where(eq(surveys.id, id));

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
