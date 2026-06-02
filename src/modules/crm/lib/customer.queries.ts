import 'server-only';

import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import { customers, leadActivities, leads, quotations, surveys } from '@/db/schema';
import type { CustomerFilters } from '../schema/customer.schema';

export async function queryCustomerById(id: string) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: {
      linkedLeads: {
        columns: {
          id: true,
          code: true,
          source: true,
          status: true,
          address: true,
          province: true,
          expectedCapacity: true,
          notes: true,
          wonAt: true,
          convertedAt: true,
          createdAt: true,
        },
        with: {
          assignedUser: { columns: { id: true, name: true } },
          createdByUser: { columns: { id: true, name: true } },
        },
        orderBy: [desc(leads.createdAt)],
      },
      lead: {
        columns: {
          id: true,
          code: true,
          source: true,
          status: true,
          address: true,
          province: true,
          expectedCapacity: true,
          notes: true,
          wonAt: true,
          convertedAt: true,
          createdAt: true,
        },
        with: {
          assignedUser: { columns: { id: true, name: true } },
          createdByUser: { columns: { id: true, name: true } },
        },
      },
      convertedByUser: { columns: { id: true, name: true } },
    },
  });

  if (!customer) return null;

  const leadIds = customer.linkedLeads.map((l: { id: string }) => l.id);
  const surveyConditions = [eq(surveys.customerId, id)];
  if (leadIds.length > 0) {
    surveyConditions.push(inArray(surveys.leadId, leadIds));
  }

  const customerSurveys = await db.query.surveys.findMany({
    where: or(...surveyConditions),
    with: {
      assignedUser: { columns: { id: true, name: true } },
      lead: { columns: { id: true, code: true } },
    },
    orderBy: [desc(surveys.createdAt)],
  });

  const surveyIds = customerSurveys.map((s) => s.id);
  const quotationConditions = [eq(quotations.customerId, id)];
  if (surveyIds.length > 0) {
    quotationConditions.push(inArray(quotations.surveyId, surveyIds));
  }

  const customerQuotations =
    quotationConditions.length > 0
      ? await db.query.quotations.findMany({
          where: or(...quotationConditions),
          columns: {
            id: true,
            code: true,
            revisionNumber: true,
            status: true,
            grandTotal: true,
            surveyId: true,
          },
          orderBy: [desc(quotations.createdAt)],
        })
      : [];

  const activityLeadIds =
    leadIds.length > 0 ? leadIds : customer.lead ? [customer.lead.id] : [];

  const activities =
    activityLeadIds.length > 0
      ? await db.query.leadActivities.findMany({
          where: inArray(leadActivities.leadId, activityLeadIds),
          with: {
            createdByUser: { columns: { id: true, name: true } },
            lead: { columns: { id: true, code: true } },
          },
          orderBy: [desc(leadActivities.createdAt)],
        })
      : [];

  return {
    ...customer,
    relatedSurveys: customerSurveys,
    relatedQuotations: customerQuotations,
    relatedActivities: activities,
  };
}

export async function queryCustomers(filters: CustomerFilters = {}) {
  const conditions = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(ilike(customers.fullName, term), ilike(customers.phone, term)));
  }

  const rows = await db.query.customers.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      lead: { columns: { id: true, code: true } },
      linkedLeads: {
        columns: { id: true, code: true, status: true, createdAt: true },
      },
    },
    orderBy: [desc(customers.createdAt)],
  });

  return rows.map((customer) => {
    const sortedLeads = [...customer.linkedLeads].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      ...customer,
      linkedLeadCount: customer.linkedLeads.length,
      latestLinkedLead: sortedLeads[0] ?? null,
    };
  });
}

export async function queryCustomerActivities(customerId: string) {
  const linked = await db.query.leads.findMany({
    where: eq(leads.customerId, customerId),
    columns: { id: true },
  });
  const leadIds = linked.map((l) => l.id);
  if (leadIds.length === 0) return [];

  return db.query.leadActivities.findMany({
    where: inArray(leadActivities.leadId, leadIds),
    with: {
      createdByUser: { columns: { id: true, name: true } },
      lead: { columns: { id: true, code: true } },
    },
    orderBy: [desc(leadActivities.createdAt)],
  });
}
