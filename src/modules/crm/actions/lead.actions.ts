'use server';

import { and, eq } from 'drizzle-orm';
import { customers } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { leadActivities, leads } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireRole } from '@/lib/auth/roles';
import { normalizePhoneForStorage } from '@/lib/phone/normalize-phone';
import { modulePerfLog, modulePerfLogError, modulePerfTimed } from '@/lib/server/module-list-log';
import {
  updateAddressSchema,
  type UpdateAddressInput,
} from '@/lib/address/address.schema';
import {
  type AddLeadNoteInput,
  type CreateLeadInput,
  type LeadFilters,
  CALL_RESULT_LABELS,
  LEAD_STATUS_LABELS,
  type CallResult,
  type LeadStatus,
  type SubmitCallResultInput,
  type UpdateLeadInput,
  type UpdateLeadStatusInput,
  addLeadNoteSchema,
  createLeadSchema,
  leadFiltersSchema,
  submitCallResultSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
} from '../schema/lead.schema';
import {
  nextLeadCode,
  queryAssignableUsers,
  queryLeadActivities,
  queryLeadById,
  queryLeads,
} from '../lib/lead.queries';
import {
  resolveStatusAfterCallAttempt,
  resolveStatusAfterCallResult,
} from '../lib/lead-status';
import {
  linkOrphanLeadsToCustomer,
  lookupCustomerByPhone,
  lookupLeadCountByPhone,
  resolveCustomerForNewLead,
} from '../lib/customer-linking';

const LEAD_WRITE_ROLES = ['admin', 'director', 'sales', 'chief_accountant'] as const;

// Converts undefined, null, or whitespace-only strings to null for DB insertion.
// Using ?? null alone is not enough — it passes '' (empty string) through unchanged.
const toNull = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getLeadsAction(
  filters: LeadFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryLeads>>>> {
  const started = performance.now();
  try {
    await modulePerfTimed('crm-leads', 'auth', () => getSessionOrThrow());
    const parsed = leadFiltersSchema.safeParse(filters);
    const safeFilters = parsed.success ? parsed.data : {};
    const data = await modulePerfTimed('crm-leads', 'queryLeads', () => queryLeads(safeFilters), {
      hasSearch: Boolean(safeFilters.search),
      hasStatus: Boolean(safeFilters.status),
    });
    modulePerfLog('crm-leads', 'action ok', performance.now() - started, {
      count: data.length,
      hasSearch: Boolean(safeFilters.search),
      hasStatus: Boolean(safeFilters.status),
    });
    return { success: true, data };
  } catch (e) {
    modulePerfLogError('crm-leads', 'action failed', e, performance.now() - started);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getLeadAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryLeadById>>>> {
  try {
    await getSessionOrThrow();
    const data = await queryLeadById(id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getLeadActivitiesAction(
  leadId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryLeadActivities>>>> {
  try {
    await getSessionOrThrow();
    const data = await queryLeadActivities(leadId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getAssignableUsersAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof queryAssignableUsers>>>
> {
  try {
    await getSessionOrThrow();
    const data = await queryAssignableUsers();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function checkPhoneForLeadAction(
  phone: string,
): Promise<
  ActionResult<{
    existingCustomer: {
      id: string;
      code: string;
      fullName: string;
      phone: string;
    } | null;
    existingLeadCount: number;
  }>
> {
  try {
    await getSessionOrThrow();
    const trimmed = phone.trim();
    if (!/^\d{9,11}$/.test(trimmed)) {
      return { success: true, data: { existingCustomer: null, existingLeadCount: 0 } };
    }

    const [existingCustomer, existingLeadCount] = await Promise.all([
      lookupCustomerByPhone(trimmed),
      lookupLeadCountByPhone(trimmed),
    ]);

    return { success: true, data: { existingCustomer, existingLeadCount } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function createLeadAction(
  input: CreateLeadInput,
): Promise<
  ActionResult<{
    id: string;
    code: string;
    customerId: string;
    customerCode: string;
    linkedExistingCustomer: boolean;
    customerAutoCreated: boolean;
  }>
> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...LEAD_WRITE_ROLES);

    const parsed = createLeadSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const code = await nextLeadCode();
    const d = parsed.data;
    const phone = normalizePhoneForStorage(d.phone);

    const result = await db.transaction(async (tx) => {
      let link: Awaited<ReturnType<typeof resolveCustomerForNewLead>>;

      if (d.customerId) {
        const existing = await tx.query.customers.findFirst({
          where: eq(customers.id, d.customerId),
          columns: { id: true, code: true },
        });
        if (!existing) {
          throw new Error('Không tìm thấy khách hàng');
        }
        link = {
          customerId: existing.id,
          customerCode: existing.code,
          linkedExisting: true,
          autoCreated: false,
        };
      } else {
        link = await resolveCustomerForNewLead(tx, { ...d, phone }, session.user.id);
      }

      const [lead] = await tx
        .insert(leads)
        .values({
          code,
          fullName: d.fullName,
          phone,
          email: toNull(d.email),
          address: d.address,
          province: toNull(d.province),
          source: d.source,
          expectedCapacity: toNull(d.expectedCapacity),
          notes: toNull(d.notes),
          assignedTo: d.assignedTo ?? null,
          referrerName: toNull(d.referrerName),
          referrerPhone: toNull(d.referrerPhone),
          referralNote: toNull(d.referralNote),
          customerId: link.customerId,
          createdBy: session.user.id,
        })
        .returning({ id: leads.id, code: leads.code });

      if (!lead) throw new Error('Không thể tạo cơ hội');

      await tx.insert(leadActivities).values({
        leadId: lead.id,
        type: 'status_change',
        content: link.linkedExisting
          ? `Cơ hội được tạo và liên kết với khách hàng ${link.customerCode}`
          : 'Cơ hội được tạo với trạng thái Mới',
        createdBy: session.user.id,
      });

      await linkOrphanLeadsToCustomer(tx, link.customerId, phone);

      return {
        id: lead.id,
        code: lead.code,
        customerId: link.customerId,
        customerCode: link.customerCode,
        linkedExistingCustomer: link.linkedExisting,
        customerAutoCreated: link.autoCreated,
        auditLogs: link.autoCreated
          ? {
              type: 'auto_created' as const,
              leadId: lead.id,
              leadCode: lead.code,
              customerId: link.customerId,
              customerCode: link.customerCode,
            }
          : link.linkedExisting
            ? {
                type: 'linked_existing' as const,
                leadId: lead.id,
                leadCode: lead.code,
                customerId: link.customerId,
                customerCode: link.customerCode,
              }
            : null,
      };
    });

    if (result.auditLogs?.type === 'auto_created') {
      await createAuditLog({
        userId: session.user.id,
        action: 'customer.auto_created_from_lead',
        resource: 'customer',
        resourceId: result.auditLogs.customerId,
        summary: `Tự động tạo khách hàng ${result.auditLogs.customerCode} từ cơ hội ${result.auditLogs.leadCode}`,
        after: {
          leadId: result.auditLogs.leadId,
          leadCode: result.auditLogs.leadCode,
          customerCode: result.auditLogs.customerCode,
        },
      });
    } else if (result.auditLogs?.type === 'linked_existing') {
      await createAuditLog({
        userId: session.user.id,
        action: 'lead.linked_to_existing_customer',
        resource: 'lead',
        resourceId: result.auditLogs.leadId,
        summary: `Cơ hội ${result.auditLogs.leadCode} liên kết với khách hàng ${result.auditLogs.customerCode}`,
        after: {
          customerId: result.auditLogs.customerId,
          customerCode: result.auditLogs.customerCode,
        },
      });
    }

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${result.id}`);
    revalidatePath('/crm/customers');
    revalidatePath(`/crm/customers/${result.customerId}`);
    return {
      success: true,
      data: {
        id: result.id,
        code: result.code,
        customerId: result.customerId,
        customerCode: result.customerCode,
        linkedExistingCustomer: result.linkedExistingCustomer,
        customerAutoCreated: result.customerAutoCreated,
      },
    };
  } catch (e) {
    console.error('[createLeadAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateLeadInstallationAddressAction(
  id: string,
  input: UpdateAddressInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...LEAD_WRITE_ROLES);

    const parsed = updateAddressSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await queryLeadById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy cơ hội' };
    if (existing.status === 'lost') {
      return { success: false, error: 'Không thể chỉnh sửa cơ hội đã mất' };
    }

    const d = parsed.data;
    const newProvince = toNull(d.province);
    const now = new Date();

    await db
      .update(leads)
      .set({
        address: d.address,
        province: newProvince,
        updatedAt: now,
      })
      .where(eq(leads.id, id));

    const summary = `Cập nhật địa chỉ lắp đặt: ${d.address}${newProvince ? `, ${newProvince}` : ''}`;

    await createAuditLog({
      userId: session.user.id,
      action: 'opportunity.installation_address.update',
      resource: 'opportunity',
      resourceId: id,
      summary,
      before: { address: existing.address, province: existing.province },
      after: { address: d.address, province: newProvince },
    });

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${id}`);
    if (existing.customerId) {
      revalidatePath(`/crm/customers/${existing.customerId}`);
    }
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateLeadInstallationAddressAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateLeadAction(
  id: string,
  input: UpdateLeadInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...LEAD_WRITE_ROLES);

    const parsed = updateLeadSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await queryLeadById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy cơ hội' };
    if (existing.status === 'won' || existing.status === 'lost') {
      return { success: false, error: 'Không thể chỉnh sửa cơ hội đã chốt hoặc đã mất' };
    }

    const d = parsed.data;
    await db
      .update(leads)
      .set({
        ...(d.fullName !== undefined && { fullName: d.fullName }),
        ...(d.phone !== undefined && { phone: d.phone }),
        ...(d.source !== undefined && { source: d.source }),
        ...(d.address !== undefined && { address: d.address }),
        email: d.email !== undefined ? toNull(d.email) : undefined,
        province: d.province !== undefined ? toNull(d.province) : undefined,
        expectedCapacity: d.expectedCapacity !== undefined ? toNull(d.expectedCapacity) : undefined,
        notes: d.notes !== undefined ? toNull(d.notes) : undefined,
        assignedTo: d.assignedTo !== undefined ? (d.assignedTo ?? null) : undefined,
        referrerName: d.referrerName !== undefined ? toNull(d.referrerName) : undefined,
        referrerPhone: d.referrerPhone !== undefined ? toNull(d.referrerPhone) : undefined,
        referralNote: d.referralNote !== undefined ? toNull(d.referralNote) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateLeadAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateLeadStatusAction(
  id: string,
  input: UpdateLeadStatusInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...LEAD_WRITE_ROLES);

    const parsed = updateLeadStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await queryLeadById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy cơ hội' };

    const now = new Date();
    const updates: Record<string, unknown> = {
      status: parsed.data.status,
      updatedAt: now,
    };

    if (parsed.data.status === 'won') updates.wonAt = now;
    if (parsed.data.status === 'lost') {
      updates.lostAt = now;
      updates.lostReason = parsed.data.lostReason ?? null;
    }

    await db.update(leads).set(updates).where(eq(leads.id, id));

    await db.insert(leadActivities).values({
      leadId: id,
      type: 'status_change',
      content: `Trạng thái: "${LEAD_STATUS_LABELS[existing.status as LeadStatus] ?? existing.status}" → "${LEAD_STATUS_LABELS[parsed.data.status]}"${parsed.data.lostReason ? ` — ${parsed.data.lostReason}` : ''}`,
      createdBy: session.user.id,
    });

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateLeadStatusAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function assignLeadAction(
  id: string,
  assignedTo: string | null,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...LEAD_WRITE_ROLES);

    const existing = await queryLeadById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy cơ hội' };

    await db.update(leads).set({ assignedTo, updatedAt: new Date() }).where(eq(leads.id, id));

    const contentParts = assignedTo
      ? [`Phân công cho người dùng mới`]
      : ['Bỏ phân công'];
    await db.insert(leadActivities).values({
      leadId: id,
      type: 'assignment_change',
      content: contentParts.join(''),
      createdBy: session.user.id,
    });

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[assignLeadAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function addLeadNoteAction(
  leadId: string,
  input: AddLeadNoteInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    if (!session.user.id) throw new Error('Unauthorized');

    const parsed = addLeadNoteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await db.query.leads.findFirst({
      where: and(eq(leads.id, leadId)),
      columns: { id: true },
    });
    if (!existing) return { success: false, error: 'Không tìm thấy cơ hội' };

    await db.insert(leadActivities).values({
      leadId,
      type: parsed.data.type,
      content: parsed.data.content,
      createdBy: session.user.id,
    });

    revalidatePath(`/crm/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[addLeadNoteAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

function parseFollowUpAt(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildCallResultContent(
  callResult: CallResult,
  note?: string,
  customerRequirements?: string,
  followUpAt?: Date | null,
): string {
  const parts = [`Kết quả: ${CALL_RESULT_LABELS[callResult]}`];
  if (note?.trim()) parts.push(`Ghi chú: ${note.trim()}`);
  if (customerRequirements?.trim()) parts.push(`Nhu cầu KH: ${customerRequirements.trim()}`);
  if (followUpAt) {
    parts.push(
      `Hẹn liên hệ lại: ${followUpAt.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    );
  }
  return parts.join('. ');
}

export async function recordCallAttemptAction(leadId: string): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...LEAD_WRITE_ROLES);

    const existing = await queryLeadById(leadId);
    if (!existing) return { success: false, error: 'Không tìm thấy cơ hội' };
    if (!existing.phone?.trim()) {
      return { success: false, error: 'Cơ hội chưa có số điện thoại' };
    }

    const now = new Date();
    const phone = existing.phone.trim();
    const newStatus = resolveStatusAfterCallAttempt(existing.status as LeadStatus);

    await db.transaction(async (tx) => {
      await tx.insert(leadActivities).values({
        leadId,
        type: 'call_attempt',
        content: `Đã bấm gọi khách hàng ${phone}`,
        createdBy: session.user.id,
      });

      const leadUpdates: Record<string, unknown> = {
        lastContactedAt: now,
        lastContactedBy: session.user.id,
        updatedAt: now,
      };
      if (newStatus) {
        leadUpdates.status = newStatus;
      }

      await tx.update(leads).set(leadUpdates).where(eq(leads.id, leadId));
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'lead.call_attempt',
      resource: 'lead',
      resourceId: leadId,
      summary: `Bấm gọi khách ${phone}`,
      after: { phone, status: newStatus ?? existing.status },
    });

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${leadId}`);
    if (existing.customerId) {
      revalidatePath(`/crm/customers/${existing.customerId}`);
    }
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[recordCallAttemptAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function submitCallResultAction(
  leadId: string,
  input: SubmitCallResultInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...LEAD_WRITE_ROLES);

    const parsed = submitCallResultSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await queryLeadById(leadId);
    if (!existing) return { success: false, error: 'Không tìm thấy cơ hội' };

    const d = parsed.data;
    const now = new Date();
    const followUpAt = parseFollowUpAt(d.followUpAt);
    const currentStatus = existing.status as LeadStatus;
    const newStatus = resolveStatusAfterCallResult(currentStatus, d.callResult);
    const content = buildCallResultContent(
      d.callResult,
      d.note,
      d.customerRequirements,
      followUpAt,
    );

    const consultationBefore = {
      consultationNote: existing.consultationNote,
      customerRequirements: existing.customerRequirements,
      preferredInstallTime: existing.preferredInstallTime,
      followUpAt: existing.followUpAt,
      lastCallResult: existing.lastCallResult,
    };

    const consultationAfter = {
      consultationNote: toNull(d.note) ?? existing.consultationNote,
      customerRequirements: toNull(d.customerRequirements) ?? existing.customerRequirements,
      preferredInstallTime: existing.preferredInstallTime,
      followUpAt: followUpAt ?? existing.followUpAt,
      lastCallResult: d.callResult,
    };

    await db.transaction(async (tx) => {
      await tx.insert(leadActivities).values({
        leadId,
        type: 'call_result',
        content,
        createdBy: session.user.id,
      });

      const leadUpdates: Record<string, unknown> = {
        lastContactedAt: now,
        lastContactedBy: session.user.id,
        lastCallResult: d.callResult,
        updatedAt: now,
      };

      if (d.note !== undefined) {
        leadUpdates.consultationNote = toNull(d.note);
      }
      if (d.customerRequirements !== undefined) {
        leadUpdates.customerRequirements = toNull(d.customerRequirements);
      }
      if (followUpAt !== null || d.followUpAt === '') {
        leadUpdates.followUpAt = followUpAt;
      }

      if (newStatus) {
        leadUpdates.status = newStatus;
        if (newStatus === 'lost') {
          leadUpdates.lostAt = now;
          leadUpdates.lostReason =
            d.callResult === 'wrong_number'
              ? 'Sai số điện thoại'
              : d.note?.trim() || 'Khách hàng không có nhu cầu';
        }
      }

      await tx.update(leads).set(leadUpdates).where(eq(leads.id, leadId));

      if (newStatus && newStatus !== currentStatus) {
        await tx.insert(leadActivities).values({
          leadId,
          type: 'status_change',
          content: `Trạng thái: "${LEAD_STATUS_LABELS[currentStatus]}" → "${LEAD_STATUS_LABELS[newStatus]}" (từ kết quả cuộc gọi)`,
          createdBy: session.user.id,
        });
      }
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'lead.call_result',
      resource: 'lead',
      resourceId: leadId,
      summary: `Ghi kết quả cuộc gọi: ${CALL_RESULT_LABELS[d.callResult]}`,
      after: { callResult: d.callResult, status: newStatus ?? currentStatus },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'lead.consultation_updated',
      resource: 'lead',
      resourceId: leadId,
      summary: 'Cập nhật thông tin tư vấn từ cuộc gọi',
      before: consultationBefore,
      after: consultationAfter,
    });

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${leadId}`);
    if (existing.customerId) {
      revalidatePath(`/crm/customers/${existing.customerId}`);
    }
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[submitCallResultAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
