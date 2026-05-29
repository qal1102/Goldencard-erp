'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { leadActivities, leads } from '@/db/schema';
import { requireRole } from '@/lib/auth/roles';
import {
  type AddLeadNoteInput,
  type CreateLeadInput,
  type LeadFilters,
  type UpdateLeadInput,
  type UpdateLeadStatusInput,
  addLeadNoteSchema,
  createLeadSchema,
  leadFiltersSchema,
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

const LEAD_WRITE_ROLES = ['admin', 'director', 'sales', 'chief_accountant'] as const;

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
  try {
    await getSessionOrThrow();
    const parsed = leadFiltersSchema.safeParse(filters);
    const safeFilters = parsed.success ? parsed.data : {};
    const data = await queryLeads(safeFilters);
    return { success: true, data };
  } catch (e) {
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

export async function createLeadAction(
  input: CreateLeadInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...LEAD_WRITE_ROLES);

    const parsed = createLeadSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const code = await nextLeadCode();
    const [lead] = await db
      .insert(leads)
      .values({
        code,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        address: parsed.data.address ?? null,
        province: parsed.data.province ?? null,
        source: parsed.data.source,
        expectedCapacity: parsed.data.expectedCapacity ?? null,
        notes: parsed.data.notes ?? null,
        assignedTo: parsed.data.assignedTo ?? null,
        createdBy: session.user.id,
      })
      .returning({ id: leads.id, code: leads.code });

    if (!lead) throw new Error('Không thể tạo lead');

    await db.insert(leadActivities).values({
      leadId: lead.id,
      type: 'status_change',
      content: 'Lead được tạo với trạng thái Mới',
      createdBy: session.user.id,
    });

    revalidatePath('/crm/leads');
    return { success: true, data: { id: lead.id, code: lead.code } };
  } catch (e) {
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
    if (!existing) return { success: false, error: 'Không tìm thấy lead' };
    if (existing.status === 'won' || existing.status === 'lost') {
      return { success: false, error: 'Không thể chỉnh sửa lead đã chốt hoặc đã mất' };
    }

    await db
      .update(leads)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(leads.id, id));

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
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
    if (!existing) return { success: false, error: 'Không tìm thấy lead' };

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
      content: `Trạng thái: "${existing.status}" → "${parsed.data.status}"${parsed.data.lostReason ? ` — ${parsed.data.lostReason}` : ''}`,
      createdBy: session.user.id,
    });

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
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
    if (!existing) return { success: false, error: 'Không tìm thấy lead' };

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
    if (!existing) return { success: false, error: 'Không tìm thấy lead' };

    await db.insert(leadActivities).values({
      leadId,
      type: parsed.data.type,
      content: parsed.data.content,
      createdBy: session.user.id,
    });

    revalidatePath(`/crm/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
