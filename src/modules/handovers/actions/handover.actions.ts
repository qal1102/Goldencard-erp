'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { handovers } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireRole } from '@/lib/auth/roles';
import { safeNotify } from '@/lib/notifications/create-notification';
import { notifyHandoverCreated } from '@/lib/notifications/events/handover-events';
import { queryWorkOrderById } from '@/modules/work-orders/lib/work-order.queries';
import {
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUS_TRANSITIONS,
  type CreateHandoverFromWorkOrderInput,
  type HandoverFilters,
  type HandoverStatus,
  type UpdateHandoverInfoInput,
  type UpdateHandoverStatusInput,
  createHandoverFromWorkOrderSchema,
  handoverFiltersSchema,
  updateHandoverInfoSchema,
  updateHandoverStatusSchema,
} from '../schema/handover.schema';
import {
  nextHandoverCode,
  queryHandoverById,
  queryHandoverByWorkOrderId,
  queryHandovers,
} from '../lib/handover.queries';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const HANDOVER_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
] as const;

const HANDOVER_WRITE_ROLES = ['admin', 'director', 'sales', 'chief_accountant'] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function revalidateHandoverPaths(handoverId: string, workOrderId?: string | null, leadId?: string | null) {
  revalidatePath('/handovers');
  revalidatePath(`/handovers/${handoverId}`);
  if (workOrderId) {
    revalidatePath(`/work-orders/${workOrderId}`);
    revalidatePath('/work-orders');
  }
  revalidatePath('/crm/customers');
  revalidatePath('/crm/leads');
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
}

export async function getHandoversAction(
  filters: HandoverFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryHandovers>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...HANDOVER_VIEW_ROLES);

    const parsed = handoverFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: 'Bộ lọc không hợp lệ' };
    }

    const data = await queryHandovers(parsed.data);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getHandoverAction(
  id: string,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof queryHandoverById>>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...HANDOVER_VIEW_ROLES);

    const handover = await queryHandoverById(id);
    if (!handover) return { success: false, error: 'Không tìm thấy phiếu bàn giao' };

    return { success: true, data: handover };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getHandoverByWorkOrderIdAction(
  workOrderId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryHandoverByWorkOrderId>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...HANDOVER_VIEW_ROLES);
    const data = await queryHandoverByWorkOrderId(workOrderId);
    return { success: true, data: data ?? undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function createHandoverFromWorkOrderAction(
  input: CreateHandoverFromWorkOrderInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...HANDOVER_WRITE_ROLES);

    const parsed = createHandoverFromWorkOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const { workOrderId } = parsed.data;
    const workOrder = await queryWorkOrderById(workOrderId);
    if (!workOrder) return { success: false, error: 'Không tìm thấy lệnh thi công' };
    if (workOrder.status !== 'completed') {
      return { success: false, error: 'Chỉ có thể tạo phiếu bàn giao từ lệnh thi công đã hoàn thành' };
    }

    const existing = await queryHandoverByWorkOrderId(workOrderId);
    if (existing) {
      return {
        success: false,
        error: `Lệnh thi công này đã có phiếu bàn giao (${existing.code})`,
      };
    }

    const code = await nextHandoverCode();

    const [handover] = await db
      .insert(handovers)
      .values({
        code,
        customerId: workOrder.customerId,
        leadId: workOrder.leadId,
        surveyId: workOrder.surveyId,
        quotationId: workOrder.quotationId,
        contractId: workOrder.contractId,
        workOrderId,
        createdBy: session.user.id,
      })
      .returning({ id: handovers.id, code: handovers.code });

    if (!handover) return { success: false, error: 'Không thể tạo phiếu bàn giao' };

    await createAuditLog({
      userId: session.user.id,
      action: 'handover.create_from_work_order',
      resource: 'handover',
      resourceId: handover.id,
      summary: `Tạo phiếu bàn giao ${handover.code} từ lệnh thi công ${workOrder.code}`,
      after: { workOrderId, workOrderCode: workOrder.code },
    });

    await safeNotify(() =>
      notifyHandoverCreated({
        handoverId: handover.id,
        handoverCode: handover.code,
        leadId: workOrder.leadId,
        actorUserId: session.user.id,
      }),
    );

    revalidateHandoverPaths(handover.id, workOrderId, workOrder.leadId);

    return { success: true, data: { id: handover.id, code: handover.code } };
  } catch (e) {
    console.error('[createHandoverFromWorkOrderAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateHandoverInfoAction(
  id: string,
  input: UpdateHandoverInfoInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...HANDOVER_WRITE_ROLES);

    const parsed = updateHandoverInfoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryHandoverById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy phiếu bàn giao' };
    if (existing.status === 'cancelled' || existing.status === 'completed') {
      return { success: false, error: 'Không thể chỉnh sửa phiếu bàn giao ở trạng thái này' };
    }

    const data = parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (data.customerReceiverName !== undefined) {
      updates.customerReceiverName = data.customerReceiverName?.trim()
        ? data.customerReceiverName.trim()
        : null;
    }
    if (data.documentLinks !== undefined) {
      updates.documentLinks = data.documentLinks?.trim() ? data.documentLinks.trim() : null;
    }
    if (data.note !== undefined) {
      updates.note = data.note?.trim() ? data.note.trim() : null;
    }
    if (data.handoverAt !== undefined) updates.handoverAt = data.handoverAt;

    await db.update(handovers).set(updates).where(eq(handovers.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'handover.update_info',
      resource: 'handover',
      resourceId: id,
      summary: `Cập nhật phiếu bàn giao ${existing.code}`,
      after: data,
    });

    revalidateHandoverPaths(id, existing.workOrderId, existing.leadId);

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateHandoverStatusAction(
  id: string,
  input: UpdateHandoverStatusInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...HANDOVER_WRITE_ROLES);

    const parsed = updateHandoverStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const { status: newStatus } = parsed.data;
    const existing = await queryHandoverById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy phiếu bàn giao' };

    const currentStatus = existing.status as HandoverStatus;
    const allowed = HANDOVER_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Không thể chuyển từ "${HANDOVER_STATUS_LABELS[currentStatus]}" sang "${HANDOVER_STATUS_LABELS[newStatus]}"`,
      };
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    };

    if (newStatus === 'completed') {
      updates.handoverAt = existing.handoverAt ?? now;
      updates.handedOverBy = session.user.id;
    }

    await db.update(handovers).set(updates).where(eq(handovers.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'handover.status.update',
      resource: 'handover',
      resourceId: id,
      summary: `${existing.code}: ${HANDOVER_STATUS_LABELS[currentStatus]} → ${HANDOVER_STATUS_LABELS[newStatus]}`,
      before: { status: currentStatus },
      after: { status: newStatus },
    });

    revalidateHandoverPaths(id, existing.workOrderId, existing.leadId);

    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateHandoverStatusAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
