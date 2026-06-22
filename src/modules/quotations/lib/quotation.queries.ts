import 'server-only';

import { and, desc, eq, ne, notExists, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customers, leads, quotationExports, quotations, surveys } from '@/db/schema';
import type { QuotationFilters } from '../schema/quotation.schema';
import {
  computeLatestEditAt,
  computeNeedsResend,
} from './quotation-resend';
import {
  computeLatestSurveyEditAt,
  isQuotationStaleFromSurvey,
} from './quotation-stale';

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

export function latestQuotationRevisionCondition() {
  return sql`
    ${quotations.revisionNumber} = (
      select max(q2.revision_number)
      from quotations q2
      where q2.survey_id = ${quotations.surveyId}
    )
  `;
}

export async function queryQuotations(filters: QuotationFilters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(quotations.status, filters.status));
  if (filters.customerId) conditions.push(eq(quotations.customerId, filters.customerId));
  conditions.push(latestQuotationRevisionCondition());

  return db.query.quotations.findMany({
    where: and(...conditions),
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      survey: { columns: { id: true, code: true } },
      createdByUser: { columns: { id: true, name: true } },
    },
    orderBy: [desc(quotations.createdAt)],
    limit: 200,
  });
}

export async function queryQuotationRevisionHistoryBySurveyId(surveyId: string) {
  return db.query.quotations.findMany({
    where: eq(quotations.surveyId, surveyId),
    columns: {
      id: true,
      code: true,
      status: true,
      revisionNumber: true,
      grandTotal: true,
      note: true,
      sentNote: true,
      responseNote: true,
      createdAt: true,
      updatedAt: true,
      sentAt: true,
      respondedAt: true,
      acceptedAt: true,
    },
    with: {
      createdByUser: { columns: { id: true, name: true } },
      respondedByUser: { columns: { id: true, name: true } },
      editLogs: {
        columns: { id: true, note: true, editedAt: true, beforeTotal: true, afterTotal: true },
        orderBy: (cols, { desc: descOrder }) => [descOrder(cols.editedAt)],
        limit: 1,
        with: {
          editedByUser: { columns: { id: true, name: true } },
        },
      },
    },
    orderBy: [desc(quotations.revisionNumber)],
  });
}

export async function queryQuotationById(id: string) {
  return db.query.quotations.findFirst({
    where: eq(quotations.id, id),
    with: {
      customer: {
        columns: { id: true, code: true, fullName: true, phone: true, address: true },
      },
      survey: {
        columns: { id: true, code: true, status: true, updatedAt: true, leadId: true, photosNote: true },
        with: {
          lead: {
            columns: {
              id: true,
              code: true,
              consultationNote: true,
              customerRequirements: true,
              preferredInstallTime: true,
              followUpAt: true,
              lastCallResult: true,
            },
          },
          editLogs: {
            columns: { editedAt: true },
            orderBy: (cols, { desc: descOrder }) => [descOrder(cols.editedAt)],
            limit: 1,
          },
        },
      },
      items: {
        orderBy: (cols, { asc }) => [asc(cols.sortOrder)],
      },
      createdByUser: { columns: { id: true, name: true } },
      updatedByUser: { columns: { id: true, name: true } },
      acceptedByUser: { columns: { id: true, name: true } },
      sentByUser: { columns: { id: true, name: true } },
      respondedByUser: { columns: { id: true, name: true } },
      exports: {
        orderBy: (cols, { desc: descOrder }) => [descOrder(cols.exportedAt)],
        with: {
          exportedByUser: { columns: { id: true, name: true } },
        },
      },
      editLogs: {
        orderBy: (cols, { desc: descOrder }) => [descOrder(cols.editedAt)],
        with: {
          editedByUser: { columns: { id: true, name: true } },
        },
      },
    },
  });
}

export function enrichQuotationDetail<
  T extends {
    status: string;
    sentAt: Date | null;
    updatedAt: Date;
    editLogs?: { editedAt: Date }[];
    survey?: {
      updatedAt: Date;
      editLogs?: { editedAt: Date }[];
    } | null;
  },
>(quotation: T) {
  const latestEditAt = computeLatestEditAt(quotation.editLogs ?? []);
  const needsResend = computeNeedsResend({
    status: quotation.status,
    sentAt: quotation.sentAt,
    latestEditAt,
  });
  const latestSurveyEditAt = computeLatestSurveyEditAt(
    quotation.survey?.editLogs ?? [],
  );
  const isSurveyStale = quotation.survey
    ? isQuotationStaleFromSurvey({
        quotationUpdatedAt: quotation.updatedAt,
        surveyUpdatedAt: quotation.survey.updatedAt,
        latestSurveyEditAt,
      })
    : false;
  return { ...quotation, latestEditAt, needsResend, isSurveyStale };
}

export async function queryQuotationDetailById(id: string) {
  const row = await queryQuotationById(id);
  if (!row) return null;
  const revisionHistory = await queryQuotationRevisionHistoryBySurveyId(row.surveyId);
  return enrichQuotationDetail({ ...row, revisionHistory });
}

export async function queryQuotationExportCount(quotationId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotationExports)
    .where(eq(quotationExports.quotationId, quotationId));
  return row?.count ?? 0;
}

export async function queryAcceptedQuotationBySurveyId(
  surveyId: string,
  excludeQuotationId?: string,
) {
  const conditions = [eq(quotations.surveyId, surveyId), eq(quotations.status, 'accepted')];
  if (excludeQuotationId) {
    conditions.push(ne(quotations.id, excludeQuotationId));
  }

  return db.query.quotations.findFirst({
    where: and(...conditions),
    columns: { id: true, code: true, revisionNumber: true },
  });
}

export async function queryMaxRevisionNumber(surveyId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${quotations.revisionNumber}), 0)::int` })
    .from(quotations)
    .where(eq(quotations.surveyId, surveyId));
  return row?.max ?? 0;
}

export async function queryQuotationsBySurveyId(surveyId: string) {
  return db.query.quotations.findMany({
    where: eq(quotations.surveyId, surveyId),
    columns: {
      id: true,
      code: true,
      status: true,
      revisionNumber: true,
      createdAt: true,
      createdBy: true,
    },
    orderBy: [desc(quotations.revisionNumber)],
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
    .where(
      and(
        eq(surveys.status, 'completed'),
        notExists(
          db
            .select({ id: quotations.id })
            .from(quotations)
            .where(eq(quotations.surveyId, surveys.id)),
        ),
      ),
    )
    .orderBy(desc(surveys.createdAt))
    .limit(50);
}

/** Latest revision for a survey (used by survey detail quick-link). */
export async function queryQuotationBySurveyId(surveyId: string) {
  return db.query.quotations.findFirst({
    where: eq(quotations.surveyId, surveyId),
    orderBy: [desc(quotations.revisionNumber)],
    columns: { id: true, code: true, status: true, revisionNumber: true },
  });
}

export async function querySurveyHasQuotation(surveyId: string): Promise<boolean> {
  const row = await db.query.quotations.findFirst({
    where: eq(quotations.surveyId, surveyId),
    columns: { id: true },
  });
  return row != null;
}

export type QuotationRow = Awaited<ReturnType<typeof queryQuotations>>[number];
export type QuotationRevisionHistoryRow = Awaited<
  ReturnType<typeof queryQuotationRevisionHistoryBySurveyId>
>[number];
export type QuotationDetail = NonNullable<Awaited<ReturnType<typeof queryQuotationDetailById>>>;
export type CompletedSurveyOption = Awaited<
  ReturnType<typeof queryCompletedSurveysWithoutQuotation>
>[number];
