'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { contracts, quotations } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireRole } from '@/lib/auth/roles';
import { safeNotify } from '@/lib/notifications/create-notification';
import {
  notifyContractCreated,
  notifyContractSigned,
} from '@/lib/notifications/events/contract-events';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TRANSITIONS,
  type ContractFilters,
  type ContractStatus,
  type CreateContractFromQuotationInput,
  type UpdateContractInfoInput,
  type UpdateContractNoteInput,
  type UpdateContractStatusInput,
  contractFiltersSchema,
  createContractFromQuotationSchema,
  updateContractInfoSchema,
  updateContractNoteSchema,
  updateContractStatusSchema,
} from '../schema/contract.schema';
import {
  nextContractCode,
  queryContractById,
  queryContractByQuotationId,
  queryContractAuditLogs,
  queryContracts,
} from '../lib/contract.queries';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const CONTRACT_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
] as const;

const CONTRACT_WRITE_ROLES = ['admin', 'director', 'sales', 'chief_accountant'] as const;

const CONTRACT_APPROVE_ROLES = ['admin', 'director', 'chief_accountant'] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function revalidateContractPaths(contractId: string, quotationId?: string | null) {
  revalidatePath('/contracts');
  revalidatePath(`/contracts/${contractId}`);
  if (quotationId) {
    revalidatePath(`/quotations/${quotationId}`);
  }
  revalidatePath('/crm/leads');
  revalidatePath('/crm/customers');
}

export async function getContractsAction(
  filters: ContractFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryContracts>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CONTRACT_VIEW_ROLES);
    const parsed = contractFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: 'Bộ lọc không hợp lệ' };
    }
    const data = await queryContracts(parsed.data);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getContractAction(
  id: string,
): Promise<
  ActionResult<{
    contract: NonNullable<Awaited<ReturnType<typeof queryContractById>>>;
    auditLogs: Awaited<ReturnType<typeof queryContractAuditLogs>>;
  }>
> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CONTRACT_VIEW_ROLES);
    const contract = await queryContractById(id);
    if (!contract) return { success: false, error: 'Không tìm thấy hợp đồng' };
    const logs = await queryContractAuditLogs(id);
    return { success: true, data: { contract, auditLogs: logs } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getContractByQuotationIdAction(
  quotationId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryContractByQuotationId>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CONTRACT_VIEW_ROLES);
    const data = await queryContractByQuotationId(quotationId);
    return { success: true, data: data ?? undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function createContractFromQuotationAction(
  input: CreateContractFromQuotationInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CONTRACT_WRITE_ROLES);

    const parsed = createContractFromQuotationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const { quotationId, note } = parsed.data;

    const quotation = await db.query.quotations.findFirst({
      where: eq(quotations.id, quotationId),
      columns: {
        id: true,
        code: true,
        status: true,
        customerId: true,
        surveyId: true,
        grandTotal: true,
      },
      with: {
        survey: {
          columns: { id: true, customerId: true, leadId: true },
        },
      },
    });

    if (!quotation) return { success: false, error: 'Không tìm thấy báo giá' };
    if (quotation.status !== 'accepted') {
      return { success: false, error: 'Chỉ có thể tạo hợp đồng từ báo giá đã được khách đồng ý' };
    }

    const existing = await queryContractByQuotationId(quotationId);
    if (existing) {
      return {
        success: false,
        error: `Báo giá này đã có hợp đồng (${existing.code})`,
      };
    }

    const customerId =
      quotation.customerId ?? quotation.survey?.customerId ?? null;
    if (!customerId) {
      return {
        success: false,
        error: 'Cần liên kết khách hàng trước khi tạo hợp đồng',
      };
    }

    const code = await nextContractCode();
    const leadId = quotation.survey?.leadId ?? null;
    const surveyId = quotation.surveyId;

    const [contract] = await db
      .insert(contracts)
      .values({
        code,
        customerId,
        leadId,
        surveyId,
        quotationId,
        contractValue: quotation.grandTotal,
        note: note?.trim() || null,
        createdBy: session.user.id,
      })
      .returning({ id: contracts.id, code: contracts.code });

    if (!contract) return { success: false, error: 'Không thể tạo hợp đồng' };

    await createAuditLog({
      userId: session.user.id,
      action: 'contract.create_from_quotation',
      resource: 'contract',
      resourceId: contract.id,
      summary: `Tạo hợp đồng ${contract.code} từ báo giá ${quotation.code}`,
      after: {
        quotationId,
        quotationCode: quotation.code,
        contractValue: quotation.grandTotal,
      },
    });

    await safeNotify(() =>
      notifyContractCreated({
        contractId: contract.id,
        contractCode: contract.code,
        leadId,
        customerId,
        actorUserId: session.user.id,
      }),
    );

    revalidateContractPaths(contract.id, quotationId);
    revalidatePath('/crm/leads');
    if (leadId) revalidatePath(`/crm/leads/${leadId}`);

    return { success: true, data: { id: contract.id, code: contract.code } };
  } catch (e) {
    console.error('[createContractFromQuotationAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateContractStatusAction(
  id: string,
  input: UpdateContractStatusInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    const sessionRoles = session.user.roles ?? [];

    const parsed = updateContractStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const { status: newStatus } = parsed.data;
    const existing = await queryContractById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy hợp đồng' };

    const currentStatus = existing.status as ContractStatus;
    const allowed = CONTRACT_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Không thể chuyển từ "${CONTRACT_STATUS_LABELS[currentStatus]}" sang "${CONTRACT_STATUS_LABELS[newStatus]}"`,
      };
    }

    if (newStatus === 'signed') {
      requireRole(sessionRoles, ...CONTRACT_APPROVE_ROLES);
    } else {
      requireRole(sessionRoles, ...CONTRACT_WRITE_ROLES);
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    };

    if (newStatus === 'signed') {
      updates.signedAt = now;
      updates.signedBy = session.user.id;
    }

    await db.update(contracts).set(updates).where(eq(contracts.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'contract.status.update',
      resource: 'contract',
      resourceId: id,
      summary: `${existing.code}: ${CONTRACT_STATUS_LABELS[currentStatus]} → ${CONTRACT_STATUS_LABELS[newStatus]}`,
      before: { status: currentStatus },
      after: { status: newStatus },
    });

    if (newStatus === 'signed') {
      await safeNotify(() =>
        notifyContractSigned({
          contractId: id,
          contractCode: existing.code,
          leadId: existing.leadId,
          customerId: existing.customerId,
          actorUserId: session.user.id,
        }),
      );
    }

    revalidateContractPaths(id, existing.quotationId);
    if (existing.leadId) revalidatePath(`/crm/leads/${existing.leadId}`);

    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateContractStatusAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export async function updateContractInfoAction(
  id: string,
  input: UpdateContractInfoInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CONTRACT_WRITE_ROLES);

    const parsed = updateContractInfoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryContractById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy hợp đồng' };
    if (existing.status === 'cancelled') {
      return { success: false, error: 'Không thể chỉnh sửa hợp đồng đã hủy' };
    }

    const data = parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (data.signedDocumentUrl !== undefined) {
      const next = trimToNull(data.signedDocumentUrl);
      if (next !== (existing.signedDocumentUrl ?? null)) {
        before.signedDocumentUrl = existing.signedDocumentUrl;
        after.signedDocumentUrl = next;
        updates.signedDocumentUrl = next;
      }
    }

    if (data.customerSignerName !== undefined) {
      const next = trimToNull(data.customerSignerName);
      if (next !== (existing.customerSignerName ?? null)) {
        before.customerSignerName = existing.customerSignerName;
        after.customerSignerName = next;
        updates.customerSignerName = next;
      }
    }

    if (data.goldenCardSignerName !== undefined) {
      const next = trimToNull(data.goldenCardSignerName);
      if (next !== (existing.goldenCardSignerName ?? null)) {
        before.goldenCardSignerName = existing.goldenCardSignerName;
        after.goldenCardSignerName = next;
        updates.goldenCardSignerName = next;
      }
    }

    if (data.note !== undefined) {
      const next = trimToNull(data.note);
      if (next !== (existing.note ?? null)) {
        before.note = existing.note;
        after.note = next;
        updates.note = next;
      }
    }

    if (Object.keys(after).length === 0) {
      return { success: true, data: undefined };
    }

    await db.update(contracts).set(updates).where(eq(contracts.id, id));

    const changedKeys = Object.keys(after);
    const auditAction =
      changedKeys.length === 1 && changedKeys[0] === 'signedDocumentUrl'
        ? 'contract.signed_document.update'
        : 'contract.update_info';

    await createAuditLog({
      userId: session.user.id,
      action: auditAction,
      resource: 'contract',
      resourceId: id,
      summary: `Cập nhật thông tin hợp đồng ${existing.code}`,
      before,
      after,
    });

    revalidateContractPaths(id, existing.quotationId);
    if (existing.leadId) revalidatePath(`/crm/leads/${existing.leadId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateContractNoteAction(
  id: string,
  input: UpdateContractNoteInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CONTRACT_WRITE_ROLES);

    const parsed = updateContractNoteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryContractById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy hợp đồng' };
    if (existing.status === 'cancelled') {
      return { success: false, error: 'Không thể chỉnh sửa hợp đồng đã hủy' };
    }

    const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;
    await db
      .update(contracts)
      .set({ note, updatedAt: new Date() })
      .where(eq(contracts.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'contract.update_info',
      resource: 'contract',
      resourceId: id,
      summary: `Cập nhật ghi chú hợp đồng ${existing.code}`,
      before: { note: existing.note },
      after: { note },
    });

    revalidateContractPaths(id, existing.quotationId);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
