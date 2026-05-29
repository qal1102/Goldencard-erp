'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { customers, leadActivities, leads } from '@/db/schema';
import { requireRole } from '@/lib/auth/roles';
import type { ActionResult } from './lead.actions';
import { queryCustomers } from '../lib/customer.queries';
import { queryLeadById } from '../lib/lead.queries';
import {
  convertLeadSchema,
  customerFiltersSchema,
  type ConvertLeadInput,
  type CustomerFilters,
} from '../schema/customer.schema';

const CONVERT_ROLES = ['admin', 'director', 'sales', 'chief_accountant'] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function convertLeadToCustomerAction(
  leadId: string,
  input: ConvertLeadInput,
): Promise<ActionResult<{ customerId: string; customerCode: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CONVERT_ROLES);

    const parsed = convertLeadSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const lead = await queryLeadById(leadId);
    if (!lead) return { success: false, error: 'Không tìm thấy lead' };
    if (lead.status !== 'won') {
      return { success: false, error: 'Chỉ có thể chuyển đổi lead đã chốt hợp đồng' };
    }
    if (lead.convertedAt) {
      return { success: false, error: 'Lead này đã được chuyển thành khách hàng' };
    }

    const result = await db.transaction(async (tx) => {
      // 1. Generate customer code from sequence (non-transactional by design)
      const codeResult = await tx.execute(sql`SELECT nextval('customer_code_seq') AS seq`);
      const seq = Number((codeResult as unknown as Array<{ seq: string }>)[0].seq);
      const customerCode = `KH${seq.toString().padStart(4, '0')}`;

      // 2. Insert customer record
      const [customer] = await tx
        .insert(customers)
        .values({
          code: customerCode,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          email: parsed.data.email ?? null,
          address: parsed.data.address,
          province: parsed.data.province ?? null,
          notes: parsed.data.notes ?? null,
          // Carry referral info forward — commission deferred to accounting/finance module (TODO)
          referrerName: parsed.data.referrerName ?? null,
          referrerPhone: parsed.data.referrerPhone ?? null,
          referralNote: parsed.data.referralNote ?? null,
          leadId,
          convertedBy: session.user.id,
        })
        .returning({ id: customers.id, code: customers.code });

      if (!customer) throw new Error('Không thể tạo hồ sơ khách hàng');

      // 3. Mark lead as converted
      const now = new Date();
      await tx
        .update(leads)
        .set({ convertedAt: now, convertedBy: session.user.id, updatedAt: now })
        .where(eq(leads.id, leadId));

      // 4. Write conversion activity log
      await tx.insert(leadActivities).values({
        leadId,
        type: 'conversion',
        content: `Đã chuyển thành khách hàng ${customerCode}`,
        createdBy: session.user.id,
      });

      return { customerId: customer.id, customerCode };
    });

    revalidatePath('/crm/leads');
    revalidatePath(`/crm/leads/${leadId}`);
    revalidatePath('/crm/customers');
    return { success: true, data: result };
  } catch (e) {
    console.error('[convertLeadToCustomerAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getCustomersAction(
  filters: CustomerFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryCustomers>>>> {
  try {
    await getSessionOrThrow();
    const parsed = customerFiltersSchema.safeParse(filters);
    const safeFilters = parsed.success ? parsed.data : {};
    const data = await queryCustomers(safeFilters);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
