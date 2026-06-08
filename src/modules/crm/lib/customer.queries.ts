import 'server-only';

import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { db } from '@/db';
import { customers, leadActivities, leads, quotations, surveys } from '@/db/schema';
import { modulePerfLog, modulePerfTimed } from '@/lib/server/module-list-log';
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
  const conditions: SQL[] = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    const searchCondition = or(ilike(customers.fullName, term), ilike(customers.phone, term));
    if (searchCondition) conditions.push(searchCondition);
  }

  const rows = await modulePerfTimed(
    'crm-customers',
    'query customers',
    () =>
      db.query.customers.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          lead: { columns: { id: true, code: true } },
        },
        orderBy: [desc(customers.createdAt)],
        limit: 200,
      }),
    { hasSearch: Boolean(filters.search) },
  );

  if (rows.length === 0) return [];

  const customerIds = rows.map((customer) => customer.id);
  const leadCountRows = await modulePerfTimed(
    'crm-customers',
    'query linked lead counts',
    () =>
      db
        .select({
          customerId: leads.customerId,
          value: count(),
        })
        .from(leads)
        .where(inArray(leads.customerId, customerIds))
        .groupBy(leads.customerId),
    { requestedCount: customerIds.length },
  );

  type LatestLeadRow = {
    id: string;
    code: string;
    status: string;
    createdAt: Date;
    customerId: string;
  };

  const latestLeadRows = await modulePerfTimed(
    'crm-customers',
    'query latest linked leads',
    async () =>
      db.execute(sql`
        SELECT DISTINCT ON (${leads.customerId})
          ${leads.id} AS "id",
          ${leads.code} AS "code",
          ${leads.status} AS "status",
          ${leads.createdAt} AS "createdAt",
          ${leads.customerId} AS "customerId"
        FROM ${leads}
        WHERE ${inArray(leads.customerId, customerIds)}
        ORDER BY ${leads.customerId}, ${leads.createdAt} DESC
      `) as Promise<LatestLeadRow[]>,
    { requestedCount: customerIds.length },
  );

  const leadCountByCustomer = new Map(
    leadCountRows
      .filter((row): row is typeof row & { customerId: string } => Boolean(row.customerId))
      .map((row) => [row.customerId, Number(row.value)]),
  );
  const latestLeadByCustomer = new Map(
    latestLeadRows.map((lead) => [lead.customerId, lead]),
  );

  const mapStarted = performance.now();
  const data = rows.map((customer) => {
    const latestLinkedLead = latestLeadByCustomer.get(customer.id) ?? null;
    return {
      ...customer,
      linkedLeads: latestLinkedLead ? [latestLinkedLead] : [],
      linkedLeadCount: leadCountByCustomer.get(customer.id) ?? 0,
      latestLinkedLead,
    };
  });
  modulePerfLog('crm-customers', 'map linked leads', performance.now() - mapStarted, {
    count: data.length,
    linkedLeadCount: leadCountRows.reduce((sum, row) => sum + Number(row.value), 0),
  });
  return data;
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
