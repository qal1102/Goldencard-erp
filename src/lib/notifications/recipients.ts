import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { leads, roles, userRoles, users } from '@/db/schema';
import type { AppRole } from '@/lib/auth/roles';
import { dedupeRecipients } from './dedupe-recipients';

export async function queryActiveUserIdsByRoles(roleNames: AppRole[]): Promise<string[]> {
  if (roleNames.length === 0) return [];

  const rows = await db
    .selectDistinct({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(inArray(roles.name, roleNames), eq(users.isActive, true)));

  return rows.map((row) => row.id);
}

export async function queryLeadOwnerUserId(leadId: string | null | undefined): Promise<string | null> {
  if (!leadId) return null;

  const lead = await db.query.leads.findFirst({
    where: eq(leads.id, leadId),
    columns: { assignedTo: true },
  });

  return lead?.assignedTo ?? null;
}

export async function collectRecipients(
  userIds: Array<string | null | undefined>,
  actorUserId?: string | null,
  options?: { includeActor?: boolean },
): Promise<string[]> {
  return dedupeRecipients(userIds, actorUserId, options);
}

export async function collectAdminDirectorRecipients(
  actorUserId?: string | null,
): Promise<string[]> {
  const ids = await queryActiveUserIdsByRoles(['admin', 'director']);
  return dedupeRecipients(ids, actorUserId);
}

export async function collectAccountingRecipients(
  actorUserId?: string | null,
): Promise<string[]> {
  const ids = await queryActiveUserIdsByRoles(['chief_accountant', 'accountant']);
  return dedupeRecipients(ids, actorUserId);
}
