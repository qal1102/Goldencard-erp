import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { createAuditLog } from '@/lib/audit/create-audit-log';

export async function getSuperAdminStatus(userId: string): Promise<{
  isActive: boolean;
  isSuperAdmin: boolean;
} | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      isActive: true,
      isSuperAdmin: true,
    },
  });

  if (!user) return null;

  return {
    isActive: user.isActive,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function assertSuperAdminFromDb(userId: string): Promise<boolean> {
  const status = await getSuperAdminStatus(userId);
  return status?.isActive === true && status.isSuperAdmin === true;
}

export function isSuperAdminSession(session: {
  user: { isSuperAdmin?: boolean };
}): boolean {
  return session.user.isSuperAdmin === true;
}

export async function requireSuperAdminAction(
  session: Session | null,
  action: string,
): Promise<void> {
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const allowed = await assertSuperAdminFromDb(session.user.id);
  if (!allowed) {
    await createAuditLog({
      userId: session.user.id,
      action: 'user.management.unauthorized',
      resource: 'user',
      summary: `Truy cập trái phép: ${action}`,
    });
    throw new Error('Unauthorized');
  }
}

export async function requireSuperAdminPage(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const allowed = await assertSuperAdminFromDb(session.user.id);
  if (!allowed) {
    await createAuditLog({
      userId: session.user.id,
      action: 'user.management.unauthorized',
      resource: 'user',
      summary: 'Truy cập trái phép trang quản lý tài khoản',
    });
    redirect('/dashboard');
  }
}
