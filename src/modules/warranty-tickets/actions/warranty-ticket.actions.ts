'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { warrantyTickets } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import { safeNotify } from '@/lib/notifications/create-notification';
import {
  notifyWarrantyTicketAssigned,
  notifyWarrantyTicketCreated,
  notifyWarrantyTicketResolved,
} from '@/lib/notifications/events/warranty-ticket-events';
import { queryHandoverById } from '@/modules/handovers/lib/handover.queries';
import {
  WARRANTY_TICKET_STATUS_LABELS,
  WARRANTY_TICKET_STATUS_TRANSITIONS,
  type CreateWarrantyTicketInput,
  type ResolveWarrantyTicketInput,
  type UpdateWarrantyTicketAssignmentInput,
  type UpdateWarrantyTicketStatusInput,
  type WarrantyTicketFilters,
  type WarrantyTicketPriority,
  type WarrantyTicketStatus,
  createWarrantyTicketSchema,
  resolveWarrantyTicketSchema,
  updateWarrantyTicketAssignmentSchema,
  updateWarrantyTicketStatusSchema,
  warrantyTicketFiltersSchema,
} from '../schema/warranty-ticket.schema';
import {
  nextWarrantyTicketCode,
  queryWarrantyAssignableUsers,
  queryWarrantyTicketById,
  queryWarrantyTickets,
  queryWarrantyTicketsByCustomerId,
  queryWarrantyTicketsByHandoverId,
} from '../lib/warranty-ticket.queries';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const WARRANTY_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

const WARRANTY_WRITE_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'customer_service',
] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function revalidateWarrantyPaths(
  ticketId: string,
  options?: {
    customerId?: string | null;
    leadId?: string | null;
    handoverId?: string | null;
  },
) {
  revalidatePath('/warranty');
  revalidatePath(`/warranty/${ticketId}`);
  revalidatePath('/crm/customers');
  revalidatePath('/crm/leads');
  revalidatePath('/handovers');
  if (options?.customerId) revalidatePath(`/crm/customers/${options.customerId}`);
  if (options?.leadId) revalidatePath(`/crm/leads/${options.leadId}`);
  if (options?.handoverId) revalidatePath(`/handovers/${options.handoverId}`);
}

function deriveStatusOnCreate(assignedTo: string | null | undefined): WarrantyTicketStatus {
  return assignedTo ? 'assigned' : 'open';
}

export async function getWarrantyTicketsAction(
  filters: WarrantyTicketFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryWarrantyTickets>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_VIEW_ROLES);

    const parsed = warrantyTicketFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeForClient(await queryWarrantyTickets(parsed.data));
    return { success: true, data };
  } catch (e) {
    devModuleLogError('warranty', 'getWarrantyTicketsAction failed', e);
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

export async function getWarrantyTicketAction(
  id: string,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof queryWarrantyTicketById>>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_VIEW_ROLES);

    const ticket = await queryWarrantyTicketById(id);
    if (!ticket) return { success: false, error: 'Không tìm thấy yêu cầu bảo hành' };

    return { success: true, data: ticket };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getWarrantyTicketsByHandoverAction(
  handoverId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryWarrantyTicketsByHandoverId>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_VIEW_ROLES);
    const data = await queryWarrantyTicketsByHandoverId(handoverId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getWarrantyTicketsByCustomerAction(
  customerId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryWarrantyTicketsByCustomerId>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_VIEW_ROLES);
    const data = await queryWarrantyTicketsByCustomerId(customerId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getWarrantyAssignableUsersAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof queryWarrantyAssignableUsers>>>
> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_VIEW_ROLES);
    const data = await queryWarrantyAssignableUsers();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function createWarrantyTicketAction(
  input: CreateWarrantyTicketInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_WRITE_ROLES);

    const parsed = createWarrantyTicketSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const data = parsed.data;
    const code = await nextWarrantyTicketCode();
    const assignedTo = data.assignedTo ?? null;
    const initialStatus = deriveStatusOnCreate(assignedTo);

    const [ticket] = await db
      .insert(warrantyTickets)
      .values({
        code,
        customerId: data.customerId,
        leadId: data.leadId ?? null,
        surveyId: data.surveyId ?? null,
        quotationId: data.quotationId ?? null,
        contractId: data.contractId ?? null,
        workOrderId: data.workOrderId ?? null,
        handoverId: data.handoverId ?? null,
        status: initialStatus,
        priority: data.priority,
        issueTitle: data.issueTitle.trim(),
        issueDescription: data.issueDescription?.trim() || null,
        customerContactName: data.customerContactName?.trim() || null,
        customerContactPhone: data.customerContactPhone?.trim() || null,
        assignedTo,
        createdBy: session.user.id,
      })
      .returning({ id: warrantyTickets.id, code: warrantyTickets.code });

    if (!ticket) return { success: false, error: 'Không thể tạo yêu cầu bảo hành' };

    await createAuditLog({
      userId: session.user.id,
      action: 'warranty_ticket.create',
      resource: 'warranty_ticket',
      resourceId: ticket.id,
      summary: `Tạo yêu cầu bảo hành ${ticket.code}: ${data.issueTitle.trim()}`,
      after: { priority: data.priority, handoverId: data.handoverId ?? null },
    });

    await safeNotify(() =>
      notifyWarrantyTicketCreated({
        ticketId: ticket.id,
        ticketCode: ticket.code,
        issueTitle: data.issueTitle.trim(),
        customerId: data.customerId,
        leadId: data.leadId,
        priority: data.priority as WarrantyTicketPriority,
        assignedToUserId: assignedTo,
        actorUserId: session.user.id,
      }),
    );

    revalidateWarrantyPaths(ticket.id, {
      customerId: data.customerId,
      leadId: data.leadId,
      handoverId: data.handoverId,
    });

    return { success: true, data: { id: ticket.id, code: ticket.code } };
  } catch (e) {
    console.error('[createWarrantyTicketAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function createWarrantyTicketFromHandoverAction(
  handoverId: string,
  input: Omit<CreateWarrantyTicketInput, 'customerId' | 'leadId' | 'surveyId' | 'quotationId' | 'contractId' | 'workOrderId' | 'handoverId'>,
): Promise<ActionResult<{ id: string; code: string }>> {
  const handover = await queryHandoverById(handoverId);
  if (!handover) return { success: false, error: 'Không tìm thấy phiếu bàn giao' };
  if (handover.status !== 'completed') {
    return { success: false, error: 'Chỉ tạo yêu cầu từ phiếu bàn giao đã hoàn tất' };
  }

  return createWarrantyTicketAction({
    ...input,
    customerId: handover.customerId,
    leadId: handover.leadId,
    surveyId: handover.surveyId,
    quotationId: handover.quotationId,
    contractId: handover.contractId,
    workOrderId: handover.workOrderId,
    handoverId: handover.id,
    customerContactName:
      input.customerContactName ?? handover.customerReceiverName ?? handover.customer?.fullName ?? null,
    customerContactPhone:
      input.customerContactPhone ?? handover.customer?.phone ?? null,
  });
}

export async function updateWarrantyTicketAssignmentAction(
  id: string,
  input: UpdateWarrantyTicketAssignmentInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_WRITE_ROLES);

    const parsed = updateWarrantyTicketAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryWarrantyTicketById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy yêu cầu bảo hành' };
    if (existing.status === 'resolved' || existing.status === 'cancelled') {
      return { success: false, error: 'Không thể cập nhật yêu cầu ở trạng thái này' };
    }

    const data = parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (data.assignedTo !== undefined) {
      updates.assignedTo = data.assignedTo;
      if (data.assignedTo && existing.status === 'open') {
        updates.status = 'assigned';
      }
    }
    if (data.scheduledAt !== undefined) {
      updates.scheduledAt = data.scheduledAt;
      if (data.scheduledAt && ['open', 'assigned'].includes(existing.status)) {
        updates.status = 'scheduled';
      }
    }

    await db.update(warrantyTickets).set(updates).where(eq(warrantyTickets.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'warranty_ticket.update_assignment',
      resource: 'warranty_ticket',
      resourceId: id,
      summary: `Cập nhật phân công ${existing.code}`,
      after: data,
    });

    if (data.assignedTo && data.assignedTo !== existing.assignedTo) {
      await safeNotify(() =>
        notifyWarrantyTicketAssigned({
          ticketId: id,
          ticketCode: existing.code,
          issueTitle: existing.issueTitle,
          customerId: existing.customerId,
          leadId: existing.leadId,
          assignedToUserId: data.assignedTo,
          actorUserId: session.user.id,
        }),
      );
    }

    revalidateWarrantyPaths(id, {
      customerId: existing.customerId,
      leadId: existing.leadId,
      handoverId: existing.handoverId,
    });

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateWarrantyTicketStatusAction(
  id: string,
  input: UpdateWarrantyTicketStatusInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_WRITE_ROLES);

    const parsed = updateWarrantyTicketStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const { status: newStatus } = parsed.data;
    const existing = await queryWarrantyTicketById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy yêu cầu bảo hành' };

    const currentStatus = existing.status as WarrantyTicketStatus;
    const allowed = WARRANTY_TICKET_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Không thể chuyển từ "${WARRANTY_TICKET_STATUS_LABELS[currentStatus]}" sang "${WARRANTY_TICKET_STATUS_LABELS[newStatus]}"`,
      };
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    };

    if (newStatus === 'cancelled') {
      updates.cancelledAt = now;
      updates.cancelledBy = session.user.id;
    }

    await db.update(warrantyTickets).set(updates).where(eq(warrantyTickets.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'warranty_ticket.status.update',
      resource: 'warranty_ticket',
      resourceId: id,
      summary: `${existing.code}: ${WARRANTY_TICKET_STATUS_LABELS[currentStatus]} → ${WARRANTY_TICKET_STATUS_LABELS[newStatus]}`,
      before: { status: currentStatus },
      after: { status: newStatus },
    });

    revalidateWarrantyPaths(id, {
      customerId: existing.customerId,
      leadId: existing.leadId,
      handoverId: existing.handoverId,
    });

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function resolveWarrantyTicketAction(
  id: string,
  input: ResolveWarrantyTicketInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WARRANTY_WRITE_ROLES);

    const parsed = resolveWarrantyTicketSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryWarrantyTicketById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy yêu cầu bảo hành' };
    if (existing.status === 'resolved' || existing.status === 'cancelled') {
      return { success: false, error: 'Yêu cầu đã kết thúc' };
    }

    const currentStatus = existing.status as WarrantyTicketStatus;
    if (!WARRANTY_TICKET_STATUS_TRANSITIONS[currentStatus]?.includes('resolved')) {
      return { success: false, error: 'Không thể hoàn tất yêu cầu ở trạng thái hiện tại' };
    }

    const data = parsed.data;
    const now = new Date();

    await db
      .update(warrantyTickets)
      .set({
        status: 'resolved',
        resolutionNote: data.resolutionNote.trim(),
        documentLinks: data.documentLinks?.trim() ? data.documentLinks.trim() : null,
        resolvedAt: now,
        resolvedBy: session.user.id,
        updatedAt: now,
      })
      .where(eq(warrantyTickets.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'warranty_ticket.resolve',
      resource: 'warranty_ticket',
      resourceId: id,
      summary: `Hoàn tất xử lý ${existing.code}`,
      after: { hasDocumentLinks: Boolean(data.documentLinks?.trim()) },
    });

    await safeNotify(() =>
      notifyWarrantyTicketResolved({
        ticketId: id,
        ticketCode: existing.code,
        issueTitle: existing.issueTitle,
        customerId: existing.customerId,
        leadId: existing.leadId,
        priority: existing.priority as WarrantyTicketPriority,
        actorUserId: session.user.id,
      }),
    );

    revalidateWarrantyPaths(id, {
      customerId: existing.customerId,
      leadId: existing.leadId,
      handoverId: existing.handoverId,
    });

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
