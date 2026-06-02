import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { roles, surveys, userRoles, users } from '@/db/schema';
import { queryAcceptedQuotationBySurveyId } from '@/modules/quotations/lib/quotation.queries';
import type { SurveyFilters, SurveyStatus } from '../schema/survey.schema';

export async function querySurveys(filters: SurveyFilters = {}) {
  const conditions = [];

  if (filters.status) conditions.push(eq(surveys.status, filters.status));
  if (filters.customerId) conditions.push(eq(surveys.customerId, filters.customerId));

  return db.query.surveys.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      lead: { columns: { id: true, code: true, fullName: true } },
      assignedUser: { columns: { id: true, name: true } },
      createdByUser: { columns: { id: true, name: true } },
      zones: {
        orderBy: (cols, { asc }) => [asc(cols.sortOrder)],
      },
    },
    orderBy: [desc(surveys.createdAt)],
  });
}

export async function querySurveysForTechnician(
  technicianId: string,
  status?: SurveyStatus,
) {
  const conditions = [eq(surveys.assignedTo, technicianId)];
  if (status) conditions.push(eq(surveys.status, status));

  return db.query.surveys.findMany({
    where: and(...conditions),
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      lead: { columns: { id: true, code: true, fullName: true } },
      assignedUser: { columns: { id: true, name: true } },
      createdByUser: { columns: { id: true, name: true } },
      zones: {
        orderBy: (cols, { asc }) => [asc(cols.sortOrder)],
      },
    },
    orderBy: [desc(surveys.createdAt)],
  });
}

export async function querySurveyById(id: string) {
  return db.query.surveys.findFirst({
    where: eq(surveys.id, id),
    with: {
      customer: {
        columns: { id: true, code: true, fullName: true, phone: true, address: true },
      },
      lead: {
        columns: {
          id: true,
          code: true,
          fullName: true,
          phone: true,
          address: true,
          province: true,
          consultationNote: true,
          customerRequirements: true,
          preferredInstallTime: true,
          followUpAt: true,
          lastCallResult: true,
        },
      },
      assignedUser: { columns: { id: true, name: true, email: true } },
      createdByUser: { columns: { id: true, name: true } },
      checkedInByUser: { columns: { id: true, name: true } },
      zones: {
        orderBy: (cols, { asc }) => [asc(cols.sortOrder)],
      },
      editLogs: {
        orderBy: (cols, { desc }) => [desc(cols.editedAt)],
        with: {
          editedByUser: { columns: { id: true, name: true } },
        },
      },
    },
  });
}

export async function querySurveyDetailById(id: string) {
  const row = await querySurveyById(id);
  if (!row) return undefined;
  const acceptedQuotation = await queryAcceptedQuotationBySurveyId(id);
  return { ...row, acceptedQuotation: acceptedQuotation ?? null };
}

export type SurveyDetail = NonNullable<Awaited<ReturnType<typeof querySurveyDetailById>>>;

export async function querySurveysByCustomerId(customerId: string) {
  return db.query.surveys.findMany({
    where: eq(surveys.customerId, customerId),
    with: {
      assignedUser: { columns: { id: true, name: true } },
      zones: {
        orderBy: (cols, { asc }) => [asc(cols.sortOrder)],
      },
    },
    orderBy: [desc(surveys.createdAt)],
  });
}

export async function queryTechnicianUsers() {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(roles.name, 'technician'), eq(users.isActive, true)))
    .orderBy(users.name);
}

export async function nextSurveyCode(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('survey_code_seq') AS seq`);
  const seq = Number((result as unknown as Array<{ seq: string }>)[0].seq);
  return `KS-${seq.toString().padStart(4, '0')}`;
}
