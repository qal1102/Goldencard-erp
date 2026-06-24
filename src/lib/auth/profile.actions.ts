'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { verifySession } from '@/lib/auth/dal';
import { updateProfileSchema } from '@/lib/auth/profile.schema';

export type UpdateProfileFormState =
  | { success: true; message: string }
  | { success: false; error: string }
  | undefined;

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function auditAvatarValue(value: string | null) {
  if (!value) return null;
  if (value.startsWith('data:image/')) return '[uploaded-avatar]';
  return value;
}

export async function updateProfileAction(
  _prevState: UpdateProfileFormState,
  formData: FormData,
): Promise<UpdateProfileFormState> {
  const session = await verifySession();

  const parsed = updateProfileSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    avatarUrl: formData.get('avatarUrl'),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dữ liệu hồ sơ không hợp lệ',
    };
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
    },
  });

  if (!currentUser?.isActive) {
    return { success: false, error: 'Tài khoản không còn hoạt động' };
  }

  const nextProfile = {
    name: parsed.data.name.trim(),
    phone: normalizeOptional(parsed.data.phone),
    avatarUrl: normalizeOptional(parsed.data.avatarUrl),
  };

  const before = {
    name: currentUser.name,
    phone: currentUser.phone,
    avatarUrl: currentUser.avatarUrl,
  };

  const hasChanged =
    before.name !== nextProfile.name ||
    before.phone !== nextProfile.phone ||
    before.avatarUrl !== nextProfile.avatarUrl;

  if (!hasChanged) {
    return { success: true, message: 'Hồ sơ chưa có thay đổi mới' };
  }

  await db
    .update(users)
    .set({
      ...nextProfile,
      updatedAt: new Date(),
    })
    .where(eq(users.id, currentUser.id));

  await createAuditLog({
    userId: currentUser.id,
    action: 'user.profile.self_update',
    resource: 'user',
    resourceId: currentUser.id,
    summary: `${currentUser.name} đã cập nhật hồ sơ cá nhân`,
    before: {
      ...before,
      avatarUrl: auditAvatarValue(before.avatarUrl),
    },
    after: {
      ...nextProfile,
      avatarUrl: auditAvatarValue(nextProfile.avatarUrl),
    },
  });

  revalidatePath('/settings');
  revalidatePath('/settings/security');
  revalidatePath('/dashboard');

  return { success: true, message: 'Đã cập nhật hồ sơ cá nhân' };
}
