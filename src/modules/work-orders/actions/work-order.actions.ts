'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { contracts, workOrders } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { hasRole, requireRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import { safeNotify } from '@/lib/notifications/create-notification';
import {
  notifyWorkOrderAssigned,
  notifyWorkOrderCompleted,
  notifyWorkOrderCreated,
} from '@/lib/notifications/events/work-order-events';
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TRANSITIONS,
  type WorkOrderFilters,
  type WorkOrderStatus,
  type CreateWorkOrderFromContractInput,
  type UpdateWorkOrderInfoInput,
  type UpdateWorkOrderStatusInput,
  type CompleteWorkOrderInput,
  createWorkOrderFromContractSchema,
  updateWorkOrderInfoSchema,
  updateWorkOrderStatusSchema,
  completeWorkOrderSchema,
  workOrderFiltersSchema,
} from '../schema/work-order.schema';
import {
  nextWorkOrderCode,
  queryWorkOrderByContractId,
  queryWorkOrderById,
  queryWorkOrders,
} from '../lib/work-order.queries';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const WORK_ORDER_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'project_manager',
  'chief_engineer',
  'chief_accountant',
  'accountant',
  'technician',
] as const;

const WORK_ORDER_WRITE_ROLES = [
  'admin',
  'director',
  'sales',
  'project_manager',
  'chief_engineer',
  'chief_accountant',
] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function revalidateWorkOrderPaths(workOrderId: string, contractId?: string | null) {
  revalidatePath('/work-orders');
  revalidatePath(`/work-orders/${workOrderId}`);
  if (contractId) {
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath('/contracts');
  }
  revalidatePath('/crm/leads');
  revalidatePath('/crm/customers');
}

function resolveInstallationFields(contract: {
  lead: { address: string; province: string | null } | null;
  survey: { address: string; province: string | null } | null;
  customer: { address: string; province: string | null };
}): { installationAddress: string; province: string | null } {
  const installationAddress =
    contract.lead?.address ?? contract.survey?.address ?? contract.customer.address;
  const province =
    contract.lead?.province ?? contract.survey?.province ?? contract.customer.province ?? null;
  return { installationAddress, province };
}

export async function getWorkOrdersAction(
  filters: WorkOrderFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryWorkOrders>>>> {
  try {
    const session = await getSessionOrThrow();
    const roles = session.user.roles ?? [];
    requireRole(roles, ...WORK_ORDER_VIEW_ROLES);

    const parsed = workOrderFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: 'Bộ lọc không hợp lệ' };
    }

    const isTechnicianOnly =
      hasRole(roles, 'technician') &&
      !hasRole(
        roles,
        'admin',
        'director',
        'sales',
        'project_manager',
        'chief_engineer',
        'chief_accountant',
        'accountant',
      );

    const effectiveFilters = { ...parsed.data };
    if (isTechnicianOnly) {
      effectiveFilters.assignedTo = session.user.id;
    }

    const data = serializeForClient(await queryWorkOrders(effectiveFilters));
    return { success: true, data };
  } catch (e) {
    devModuleLogError('work-orders', 'getWorkOrdersAction failed', e);
    return {
      success: false,
      error:
        e instanceof Error && e.message !== 'Unauthorized'
          ? MODULE_LIST_ERROR
          : e instanceof Error
            ? e.message
            : MODULE_LIST_ERROR,
    };
  }
}

export async function getWorkOrderAction(
  id: string,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof queryWorkOrderById>>>>> {
  try {
    const session = await getSessionOrThrow();
    const roles = session.user.roles ?? [];
    requireRole(roles, ...WORK_ORDER_VIEW_ROLES);

    const workOrder = await queryWorkOrderById(id);
    if (!workOrder) return { success: false, error: 'Không tìm thấy lệnh thi công' };

    const isTechnicianOnly =
      hasRole(roles, 'technician') &&
      !hasRole(
        roles,
        'admin',
        'director',
        'sales',
        'project_manager',
        'chief_engineer',
        'chief_accountant',
        'accountant',
      );
    if (isTechnicianOnly && workOrder.assignedTo !== session.user.id) {
      return { success: false, error: 'Không có quyền xem lệnh thi công này' };
    }

    return { success: true, data: workOrder };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getWorkOrderByContractIdAction(
  contractId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryWorkOrderByContractId>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_VIEW_ROLES);
    const data = await queryWorkOrderByContractId(contractId);
    return { success: true, data: data ?? undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function createWorkOrderFromContractAction(
  input: CreateWorkOrderFromContractInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_WRITE_ROLES);

    const parsed = createWorkOrderFromContractSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const { contractId } = parsed.data;

    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, contractId),
      columns: {
        id: true,
        code: true,
        status: true,
        customerId: true,
        leadId: true,
        surveyId: true,
        quotationId: true,
      },
      with: {
        lead: { columns: { address: true, province: true } },
        survey: { columns: { address: true, province: true } },
        customer: { columns: { address: true, province: true } },
      },
    });

    if (!contract) return { success: false, error: 'Không tìm thấy hợp đồng' };
    if (contract.status !== 'signed') {
      return { success: false, error: 'Chỉ có thể tạo lệnh thi công từ hợp đồng đã ký' };
    }

    const existing = await queryWorkOrderByContractId(contractId);
    if (existing) {
      return {
        success: false,
        error: `Hợp đồng này đã có lệnh thi công (${existing.code})`,
      };
    }

    const { installationAddress, province } = resolveInstallationFields({
      lead: contract.lead,
      survey: contract.survey,
      customer: contract.customer,
    });

    const code = await nextWorkOrderCode();

    const [workOrder] = await db
      .insert(workOrders)
      .values({
        code,
        customerId: contract.customerId,
        leadId: contract.leadId,
        surveyId: contract.surveyId,
        quotationId: contract.quotationId,
        contractId,
        installationAddress,
        province,
        createdBy: session.user.id,
      })
      .returning({ id: workOrders.id, code: workOrders.code });

    if (!workOrder) return { success: false, error: 'Không thể tạo lệnh thi công' };

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.create_from_contract',
      resource: 'work_order',
      resourceId: workOrder.id,
      summary: `Tạo lệnh thi công ${workOrder.code} từ hợp đồng ${contract.code}`,
      after: { contractId, contractCode: contract.code },
    });

    await safeNotify(() =>
      notifyWorkOrderCreated({
        workOrderId: workOrder.id,
        workOrderCode: workOrder.code,
        leadId: contract.leadId,
        customerId: contract.customerId,
        assignedTo: null,
        actorUserId: session.user.id,
      }),
    );

    revalidateWorkOrderPaths(workOrder.id, contractId);
    if (contract.leadId) revalidatePath(`/crm/leads/${contract.leadId}`);

    return { success: true, data: { id: workOrder.id, code: workOrder.code } };
  } catch (e) {
    console.error('[createWorkOrderFromContractAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateWorkOrderInfoAction(
  id: string,
  input: UpdateWorkOrderInfoInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_WRITE_ROLES);

    const parsed = updateWorkOrderInfoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryWorkOrderById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy lệnh thi công' };
    if (existing.status === 'cancelled' || existing.status === 'completed') {
      return { success: false, error: 'Không thể chỉnh sửa lệnh thi công ở trạng thái này' };
    }

    const data = parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const previousAssignedTo = existing.assignedTo ?? null;

    if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo;
    if (data.scheduledStartAt !== undefined) updates.scheduledStartAt = data.scheduledStartAt;
    if (data.scheduledEndAt !== undefined) updates.scheduledEndAt = data.scheduledEndAt;
    if (data.note !== undefined) {
      updates.note = data.note?.trim() ? data.note.trim() : null;
    }

    await db.update(workOrders).set(updates).where(eq(workOrders.id, id));

    const nextAssignedTo =
      data.assignedTo !== undefined ? (data.assignedTo ?? null) : previousAssignedTo;
    if (
      data.assignedTo !== undefined &&
      nextAssignedTo &&
      nextAssignedTo !== previousAssignedTo
    ) {
      await safeNotify(() =>
        notifyWorkOrderAssigned({
          workOrderId: id,
          workOrderCode: existing.code,
          leadId: existing.leadId,
          customerId: existing.customerId,
          assignedTo: nextAssignedTo,
          actorUserId: session.user.id,
        }),
      );
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.update_info',
      resource: 'work_order',
      resourceId: id,
      summary: `Cập nhật lệnh thi công ${existing.code}`,
      after: data,
    });

    revalidateWorkOrderPaths(id, existing.contractId);
    if (existing.leadId) revalidatePath(`/crm/leads/${existing.leadId}`);

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateWorkOrderStatusAction(
  id: string,
  input: UpdateWorkOrderStatusInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_WRITE_ROLES);

    const parsed = updateWorkOrderStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const { status: newStatus } = parsed.data;
    const existing = await queryWorkOrderById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy lệnh thi công' };

    if (newStatus === 'completed') {
      return {
        success: false,
        error: 'Vui lòng sử dụng form hoàn thành thi công để ghi nhận bằng chứng',
      };
    }

    const currentStatus = existing.status as WorkOrderStatus;
    const allowed = WORK_ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Không thể chuyển từ "${WORK_ORDER_STATUS_LABELS[currentStatus]}" sang "${WORK_ORDER_STATUS_LABELS[newStatus]}"`,
      };
    }

    await db
      .update(workOrders)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(workOrders.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.status.update',
      resource: 'work_order',
      resourceId: id,
      summary: `${existing.code}: ${WORK_ORDER_STATUS_LABELS[currentStatus]} → ${WORK_ORDER_STATUS_LABELS[newStatus]}`,
      before: { status: currentStatus },
      after: { status: newStatus },
    });

    revalidateWorkOrderPaths(id, existing.contractId);
    if (existing.leadId) revalidatePath(`/crm/leads/${existing.leadId}`);

    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateWorkOrderStatusAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function completeWorkOrderAction(
  id: string,
  input: CompleteWorkOrderInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_WRITE_ROLES);

    const parsed = completeWorkOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryWorkOrderById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy lệnh thi công' };

    const currentStatus = existing.status as WorkOrderStatus;
    const allowed = WORK_ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes('completed')) {
      return {
        success: false,
        error: `Không thể hoàn thành lệnh thi công ở trạng thái "${WORK_ORDER_STATUS_LABELS[currentStatus]}"`,
      };
    }

    const { completionNote, completionDocumentLinks } = parsed.data;
    const now = new Date();

    await db
      .update(workOrders)
      .set({
        status: 'completed',
        completionNote: completionNote.trim(),
        completionDocumentLinks: completionDocumentLinks?.trim()
          ? completionDocumentLinks.trim()
          : null,
        completedAt: now,
        completedBy: session.user.id,
        updatedAt: now,
      })
      .where(eq(workOrders.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.complete',
      resource: 'work_order',
      resourceId: id,
      summary: `Hoàn thành thi công ${existing.code}`,
      before: { status: currentStatus },
      after: {
        status: 'completed',
        completionNote: completionNote.trim(),
        hasDocumentLinks: Boolean(completionDocumentLinks?.trim()),
      },
    });

    await safeNotify(() =>
      notifyWorkOrderCompleted({
        workOrderId: id,
        workOrderCode: existing.code,
        leadId: existing.leadId,
        customerId: existing.customerId,
        actorUserId: session.user.id,
      }),
    );

    revalidateWorkOrderPaths(id, existing.contractId);
    if (existing.leadId) revalidatePath(`/crm/leads/${existing.leadId}`);

    return { success: true, data: undefined };
  } catch (e) {
    console.error('[completeWorkOrderAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
