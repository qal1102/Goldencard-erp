import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { roles, users } from '@/db/schema';
import { evaluateCanSetActive } from './admin-user-active.rules';

export { evaluateCanSetActive } from './admin-user-active.rules';

const SYSTEM_ROLE_NAMES = new Set(['super_admin', 'root', 'owner']);

export function evaluateCanUpdateRoles(params: {
  targetIsSuperAdmin: boolean;
  newRoleNames: string[];
}): { ok: true } | { ok: false; error: string } {
  if (params.targetIsSuperAdmin) {
    return {
      ok: false,
      error: 'Không thể chỉnh vai trò tài khoản Super Admin.',
    };
  }

  if (params.newRoleNames.some((name) => SYSTEM_ROLE_NAMES.has(name))) {
    return {
      ok: false,
      error: 'Không thể gán vai trò hệ thống qua màn hình quản lý tài khoản.',
    };
  }

  return { ok: true };
}

export async function userIsSuperAdmin(userId: string): Promise<boolean> {
  const row = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row[0]?.isSuperAdmin ?? false;
}

export async function assertCanUpdateRoles(
  targetUserId: string,
  newRoleIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const targetIsSuperAdmin = await userIsSuperAdmin(targetUserId);
  const newRoleNames =
    newRoleIds.length === 0
      ? []
      : (
          await db
            .select({ name: roles.name })
            .from(roles)
            .where(inArray(roles.id, newRoleIds))
        ).map((role) => role.name);

  return evaluateCanUpdateRoles({ targetIsSuperAdmin, newRoleNames });
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
