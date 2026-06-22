import 'server-only';

import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import type { AuditLogFilters } from '../schema/audit-log.schema';

function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function queryAuditLogs(filters: AuditLogFilters = {}) {
  const from = parseDateBoundary(filters.from);
  const to = parseDateBoundary(filters.to, true);
  const summaryExpr = sql<string | null>`${auditLogs.newData}->>'summary'`;
  const actorNameExpr = sql<string>`coalesce(${users.name}, 'Hệ thống')`;

  const conditions = [
    filters.userId ? eq(auditLogs.userId, filters.userId) : undefined,
    filters.resource ? eq(auditLogs.resource, filters.resource) : undefined,
    filters.action ? eq(auditLogs.action, filters.action) : undefined,
    from ? gte(auditLogs.createdAt, from) : undefined,
    to ? lte(auditLogs.createdAt, to) : undefined,
    filters.q
      ? or(
          ilike(auditLogs.action, `%${filters.q}%`),
          ilike(auditLogs.resource, `%${filters.q}%`),
          ilike(auditLogs.resourceId, `%${filters.q}%`),
          ilike(summaryExpr, `%${filters.q}%`),
          ilike(actorNameExpr, `%${filters.q}%`),
        )
      : undefined,
  ].filter(Boolean);

  return db
    .select({
      id: sql<string>`${auditLogs.id}::text`,
      action: auditLogs.action,
      resource: auditLogs.resource,
      resourceId: auditLogs.resourceId,
      summary: summaryExpr,
      actorUserId: auditLogs.userId,
      actorName: actorNameExpr,
      actorEmail: users.email,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      hasBefore: sql<boolean>`${auditLogs.oldData} is not null`,
      hasAfter: sql<boolean>`${auditLogs.newData} is not null`,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);
}

export async function queryAuditLogFilterOptions() {
  const [actors, resources, actions] = await Promise.all([
    db
      .selectDistinct({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(users.name),
    db
      .selectDistinct({ value: auditLogs.resource })
      .from(auditLogs)
      .orderBy(auditLogs.resource),
    db
      .selectDistinct({ value: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action),
  ]);

  return { actors, resources, actions };
}

export type AuditLogRow = Awaited<ReturnType<typeof queryAuditLogs>>[number];
export type AuditLogFilterOptions = Awaited<ReturnType<typeof queryAuditLogFilterOptions>>;

