import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { evaluateCanSetActive } from './admin-user-active.rules';

export { evaluateCanSetActive } from './admin-user-active.rules';

export async function userIsSuperAdmin(userId: string): Promise<boolean> {
  const row = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row[0]?.isSuperAdmin ?? false;
}

export async function assertCanUpdateRoles(
  _targetUserId: string,
  _newRoleIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  return { ok: true };
}

export async function assertCanSetActive(
  targetUserId: string,
  isActive: boolean,
  actorUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return evaluateCanSetActive({
    isActive,
    targetIsSuperAdmin: await userIsSuperAdmin(targetUserId),
    targetUserId,
    actorUserId,
  });
}
