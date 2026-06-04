import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

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
  if (isActive) return { ok: true };

  if (await userIsSuperAdmin(targetUserId)) {
    return {
      ok: false,
      error: 'Không thể khóa tài khoản Super Admin.',
    };
  }

  if (targetUserId === actorUserId) {
    return {
      ok: false,
      error: 'Không thể tự khóa tài khoản của chính bạn.',
    };
  }

  return { ok: true };
}
