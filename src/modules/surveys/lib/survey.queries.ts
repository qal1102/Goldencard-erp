import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { roles, surveys, userRoles, users } from '@/db/schema';
import type { SurveyFilters, SurveyStatus } from '../schema/survey.schema';

export async function querySurveys(filters: SurveyFilters = {}) {
  const conditions = [];

  if (filters.status) conditions.push(eq(surveys.status, filters.status));
  if (filters.customerId) conditions.push(eq(surveys.customerId, filters.customerId));

  return db.query.surveys.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      lead: { columns: { id: true, code: true } },
      assignedUser: { columns: { id: true, name: true } },
      createdByUser: { columns: { id: true, name: true } },
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
      lead: { columns: { id: true, code: true } },
      assignedUser: { columns: { id: true, name: true } },
      createdByUser: { columns: { id: true, name: true } },
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
      lead: { columns: { id: true, code: true } },
      assignedUser: { columns: { id: true, name: true, email: true } },
      createdByUser: { columns: { id: true, name: true } },
    },
  });
}

export async function querySurveysByCustomerId(customerId: string) {
  return db.query.surveys.findMany({
    where: eq(surveys.customerId, customerId),
    with: {
      assignedUser: { columns: { id: true, name: true } },
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
