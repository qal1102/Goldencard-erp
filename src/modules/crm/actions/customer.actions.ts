'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { customers, leadActivities, leads } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { updateAddressSchema, type UpdateAddressInput } from '@/lib/address/address.schema';
import { requireRole } from '@/lib/auth/roles';
import { modulePerfLog, modulePerfLogError, modulePerfTimed } from '@/lib/server/module-list-log';
import type { ActionResult } from './lead.actions';
import { queryCustomerById, queryCustomers } from '../lib/customer.queries';
import { queryLeadById } from '../lib/lead.queries';
import {
  convertLeadSchema,
  customerFiltersSchema,
  type ConvertLeadInput,
  type CustomerFilters,
} from '../schema/customer.schema';

const CONVERT_ROLES = ['admin', 'director', 'sales', 'chief_accountant'] as const;
const CUSTOMER_WRITE_ROLES = ['admin', 'director', 'sales', 'chief_accountant'] as const;

function toNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

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
    if (!lead) return { success: false, error: 'Không tìm thấy cơ hội' };
    if (lead.status !== 'won') {
      return { success: false, error: 'Chỉ có thể chuyển đổi cơ hội đã chốt hợp đồng' };
    }
    if (lead.convertedAt) {
      return { success: false, error: 'Cơ hội này đã được chuyển thành khách hàng' };
    }

    const result = await db.transaction(async (tx) => {
      const now = new Date();

      if (lead.customerId) {
        const [customer] = await tx
          .update(customers)
          .set({
            fullName: parsed.data.fullName,
            phone: parsed.data.phone,
            email: parsed.data.email ?? null,
            address: parsed.data.address,
            province: parsed.data.province ?? null,
            notes: parsed.data.notes ?? null,
            referrerName: parsed.data.referrerName ?? null,
            referrerPhone: parsed.data.referrerPhone ?? null,
            referralNote: parsed.data.referralNote ?? null,
            leadId,
            convertedBy: session.user.id,
            updatedAt: now,
          })
          .where(eq(customers.id, lead.customerId))
          .returning({ id: customers.id, code: customers.code });

        if (!customer) throw new Error('Không tìm thấy hồ sơ khách hàng liên kết');

        await tx
          .update(leads)
          .set({ convertedAt: now, convertedBy: session.user.id, updatedAt: now })
          .where(eq(leads.id, leadId));

        await tx.insert(leadActivities).values({
          leadId,
          type: 'conversion',
          content: `Đã chuyển thành khách hàng ${customer.code}`,
          createdBy: session.user.id,
        });

        return { customerId: customer.id, customerCode: customer.code };
      }

      // Legacy path: no linked customer yet — create new customer record
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
          referrerName: parsed.data.referrerName ?? null,
          referrerPhone: parsed.data.referrerPhone ?? null,
          referralNote: parsed.data.referralNote ?? null,
          leadId,
          convertedBy: session.user.id,
        })
        .returning({ id: customers.id, code: customers.code });

      if (!customer) throw new Error('Không thể tạo hồ sơ khách hàng');

      await tx
        .update(leads)
        .set({
          convertedAt: now,
          convertedBy: session.user.id,
          customerId: customer.id,
          updatedAt: now,
        })
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

export async function getCustomerAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryCustomerById>>>> {
  try {
    await getSessionOrThrow();
    const data = await queryCustomerById(id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function updateCustomerAddressAction(
  customerId: string,
  input: UpdateAddressInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CUSTOMER_WRITE_ROLES);

    const parsed = updateAddressSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    const existing = await queryCustomerById(customerId);
    if (!existing) return { success: false, error: 'Không tìm thấy khách hàng' };

    const d = parsed.data;
    const newProvince = toNull(d.province);
    const now = new Date();

    await db
      .update(customers)
      .set({
        address: d.address,
        province: newProvince,
        updatedAt: now,
      })
      .where(eq(customers.id, customerId));

    const summary = `Cập nhật địa chỉ liên hệ: ${d.address}${newProvince ? `, ${newProvince}` : ''}`;

    await createAuditLog({
      userId: session.user.id,
      action: 'customer.address.update',
      resource: 'customer',
      resourceId: customerId,
      summary,
      before: { address: existing.address, province: existing.province },
      after: { address: d.address, province: newProvince },
    });

    revalidatePath('/crm/customers');
    revalidatePath(`/crm/customers/${customerId}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateCustomerAddressAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getCustomersAction(
  filters: CustomerFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryCustomers>>>> {
  const started = performance.now();
  try {
    await modulePerfTimed('crm-customers', 'auth', () => getSessionOrThrow());
    const parsed = customerFiltersSchema.safeParse(filters);
    const safeFilters = parsed.success ? parsed.data : {};
    const data = await modulePerfTimed(
      'crm-customers',
      'queryCustomers',
      () => queryCustomers(safeFilters),
      { hasSearch: Boolean(safeFilters.search) },
    );
    modulePerfLog('crm-customers', 'action ok', performance.now() - started, {
      count: data.length,
      hasSearch: Boolean(safeFilters.search),
    });
    return { success: true, data };
  } catch (e) {
    modulePerfLogError('crm-customers', 'action failed', e, performance.now() - started);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
