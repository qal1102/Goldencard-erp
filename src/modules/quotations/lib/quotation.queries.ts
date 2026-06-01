import 'server-only';

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customers, leads, quotations, surveys } from '@/db/schema';
import type { QuotationFilters } from '../schema/quotation.schema';

/**
 * Consumes the next value from quotation_code_seq and returns a formatted
 * code like BG-0001. PostgreSQL sequences never roll back, so it is safe
 * (and simpler) to call this outside a transaction — matching the pattern
 * used by nextSurveyCode().
 */
export async function nextQuotationCode(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('quotation_code_seq') AS seq`);
  const seq = Number((result as unknown as Array<{ seq: string }>)[0].seq);
  return `BG-${seq.toString().padStart(4, '0')}`;
}

export async function queryQuotations(filters: QuotationFilters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(quotations.status, filters.status));
  if (filters.customerId) conditions.push(eq(quotations.customerId, filters.customerId));

  return db.query.quotations.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      survey: { columns: { id: true, code: true } },
      createdByUser: { columns: { id: true, name: true } },
    },
    orderBy: [desc(quotations.createdAt)],
  });
}

export async function queryQuotationById(id: string) {
  return db.query.quotations.findFirst({
    where: eq(quotations.id, id),
    with: {
      customer: {
        columns: { id: true, code: true, fullName: true, phone: true, address: true },
      },
      survey: { columns: { id: true, code: true, status: true } },
      items: {
        orderBy: (cols, { asc }) => [asc(cols.sortOrder)],
      },
      createdByUser: { columns: { id: true, name: true } },
      updatedByUser: { columns: { id: true, name: true } },
      acceptedByUser: { columns: { id: true, name: true } },
    },
  });
}

/**
 * Returns surveys that are completed and do not yet have a quotation.
 * Includes both customer-linked and lead-origin surveys.
 * The display name is the customer name when available, otherwise the lead name.
 */
export async function queryCompletedSurveysWithoutQuotation() {
  return db
    .select({
      id: surveys.id,
      code: surveys.code,
      address: surveys.address,
      completedAt: surveys.completedAt,
      customerId: surveys.customerId,
      customerName: sql<string>`COALESCE(${customers.fullName}, ${leads.fullName})`,
    })
    .from(surveys)
    .leftJoin(customers, eq(customers.id, surveys.customerId))
    .leftJoin(leads, eq(leads.id, surveys.leadId))
    .leftJoin(quotations, eq(quotations.surveyId, surveys.id))
    .where(and(eq(surveys.status, 'completed'), isNull(quotations.id)))
    .orderBy(desc(surveys.createdAt));
}

export async function queryQuotationBySurveyId(surveyId: string) {
  return db.query.quotations.findFirst({
    where: eq(quotations.surveyId, surveyId),
    columns: { id: true, code: true, status: true },
  });
}

export type QuotationRow = Awaited<ReturnType<typeof queryQuotations>>[number];
export type QuotationDetail = Awaited<ReturnType<typeof queryQuotationById>>;
export type CompletedSurveyOption = Awaited<
  ReturnType<typeof queryCompletedSurveysWithoutQuotation>
>[number];
