import 'server-only';

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { roles, userRoles, users, warrantyTickets } from '@/db/schema';
import type { WarrantyTicketFilters } from '../schema/warranty-ticket.schema';

export async function nextWarrantyTicketCode(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('warranty_ticket_code_seq') AS seq`);
  const seq = Number((result as unknown as Array<{ seq: string }>)[0].seq);
  return `BH-${seq.toString().padStart(4, '0')}`;
}

export async function queryWarrantyTickets(filters: WarrantyTicketFilters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(warrantyTickets.status, filters.status));
  if (filters.priority) conditions.push(eq(warrantyTickets.priority, filters.priority));
  if (filters.customerId) conditions.push(eq(warrantyTickets.customerId, filters.customerId));
  if (filters.handoverId) conditions.push(eq(warrantyTickets.handoverId, filters.handoverId));
  if (filters.leadId) conditions.push(eq(warrantyTickets.leadId, filters.leadId));

  return db.query.warrantyTickets.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      handover: { columns: { id: true, code: true } },
      assignedUser: { columns: { id: true, name: true, jobTitle: true, avatarUrl: true } },
    },
    orderBy: [desc(warrantyTickets.reportedAt)],
    limit: 200,
  });
}

export async function queryWarrantyTicketById(id: string) {
  return db.query.warrantyTickets.findFirst({
    where: eq(warrantyTickets.id, id),
    with: {
      customer: { columns: { id: true, code: true, fullName: true, phone: true } },
      lead: { columns: { id: true, code: true, fullName: true } },
      survey: { columns: { id: true, code: true } },
      quotation: { columns: { id: true, code: true } },
      contract: { columns: { id: true, code: true } },
      workOrder: { columns: { id: true, code: true } },
      handover: { columns: { id: true, code: true, status: true } },
      assignedUser: { columns: { id: true, name: true, jobTitle: true, avatarUrl: true } },
      resolvedByUser: { columns: { id: true, name: true } },
      cancelledByUser: { columns: { id: true, name: true } },
      createdByUser: { columns: { id: true, name: true } },
    },
  });
}

export async function queryWarrantyTicketsByHandoverId(handoverId: string, limit = 5) {
  return db.query.warrantyTickets.findMany({
    where: eq(warrantyTickets.handoverId, handoverId),
    columns: {
      id: true,
      code: true,
      status: true,
      priority: true,
      issueTitle: true,
      reportedAt: true,
    },
    orderBy: [desc(warrantyTickets.reportedAt)],
    limit,
  });
}

export async function queryWarrantyTicketsByCustomerId(customerId: string) {
  return db.query.warrantyTickets.findMany({
    where: eq(warrantyTickets.customerId, customerId),
    with: {
      handover: { columns: { id: true, code: true } },
      lead: { columns: { id: true, code: true } },
    },
    orderBy: [desc(warrantyTickets.reportedAt)],
  });
}

export async function queryWarrantyTicketsByLeadIds(leadIds: string[]) {
  if (leadIds.length === 0) return [];

  return db.query.warrantyTickets.findMany({
    where: inArray(warrantyTickets.leadId, leadIds),
    columns: {
      id: true,
      code: true,
      leadId: true,
      status: true,
      priority: true,
      issueTitle: true,
      reportedAt: true,
    },
    orderBy: [desc(warrantyTickets.reportedAt)],
  });
}

export async function queryWarrantyAssignableUsers() {
  const rows = await db
    .selectDistinct({
      id: users.id,
      name: users.name,
      email: users.email,
      jobTitle: users.jobTitle,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        inArray(roles.name, ['customer_service', 'technician', 'admin', 'director']),
        eq(users.isActive, true),
      ),
    )
    .orderBy(users.name);

  return rows;
}

export type WarrantyTicketRow = Awaited<ReturnType<typeof queryWarrantyTickets>>[number];
export type WarrantyTicketDetail = NonNullable<
  Awaited<ReturnType<typeof queryWarrantyTicketById>>
>;
