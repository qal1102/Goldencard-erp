'use server';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { changePasswordSchema } from '@/lib/auth/password.schema';

export type ChangePasswordFormState = { error?: string } | undefined;

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.' };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user?.isActive || !user.passwordHash) {
    return { error: 'Không thể đổi mật khẩu cho tài khoản này.' };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
    };
  }

  const { currentPassword, newPassword } = parsed.data;

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { error: 'Mật khẩu hiện tại không đúng.' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await createAuditLog({
    userId: user.id,
    action: 'user.password.self_change',
    resource: 'user',
    resourceId: user.id,
    summary: `${user.name} đã đổi mật khẩu`,
  });

  await signOut({ redirect: false });
  redirect('/login?passwordChanged=1');
}
