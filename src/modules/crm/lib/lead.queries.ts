import 'server-only';

import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { leadActivities, leads, users } from '@/db/schema';
import type { LeadFilters } from '../schema/lead.schema';

export async function queryLeads(filters: LeadFilters = {}) {
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(leads.status, filters.status));
  }

  if (filters.assignedTo) {
    conditions.push(eq(leads.assignedTo, filters.assignedTo));
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(leads.fullName, term), ilike(leads.phone, term), ilike(leads.email, term)),
    );
  }

  return db.query.leads.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      assignedUser: {
        columns: { id: true, name: true },
      },
      createdByUser: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [desc(leads.createdAt)],
  });
}

export async function queryLeadById(id: string) {
  return db.query.leads.findFirst({
    where: eq(leads.id, id),
    with: {
      assignedUser: {
        columns: { id: true, name: true, email: true },
      },
      createdByUser: {
        columns: { id: true, name: true },
      },
      customer: {
        columns: { id: true, code: true, fullName: true, phone: true },
      },
      linkedCustomer: {
        columns: { id: true, code: true, fullName: true, phone: true },
      },
      lastContactedByUser: {
        columns: { id: true, name: true },
      },
    },
  });
}

export async function queryLeadActivities(leadId: string) {
  return db.query.leadActivities.findMany({
    where: eq(leadActivities.leadId, leadId),
    with: {
      createdByUser: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [desc(leadActivities.createdAt)],
  });
}

export async function queryAssignableUsers() {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(users.name);
}

export async function nextLeadCode(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('lead_code_seq') AS seq`);
  const seq = Number((result as unknown as Array<{ seq: string }>)[0].seq);
  return `LEAD-${seq.toString().padStart(4, '0')}`;
}
