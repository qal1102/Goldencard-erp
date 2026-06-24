'use server';

import bcrypt from 'bcryptjs';
import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { userRoles, users } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireSuperAdminAction } from '@/lib/auth/super-admin';
import { normalizePhoneForStorage } from '@/lib/phone/normalize-phone';
import {
  assertCanSetActive,
  assertCanUpdateRoles,
  evaluateCanUpdateRoles,
} from '../lib/admin-user-safety';
import {
  serializeAdminUserList,
  type SerializedAdminUserListRow,
} from '../lib/admin-user-serialize';
import {
  queryAdminUserById,
  queryAdminUsers,
  queryAllRoles,
  queryUserRoleIds,
} from '../lib/admin-user.queries';
import { formatRoleNames } from '../lib/role-labels';
import {
  ADMIN_USER_VALIDATION_ERROR,
  USER_ACTIVE_AUDIT_ACTIONS,
  adminUserFiltersSchema,
  createAdminUserSchema,
  resetAdminUserPasswordSchema,
  setAdminUserActiveSchema,
  updateAdminUserSchema,
  type AdminUserFilters,
  type CreateAdminUserInput,
  type ResetAdminUserPasswordInput,
  type SetAdminUserActiveInput,
  type UpdateAdminUserInput,
} from '../schema/admin-user.schema';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function requireSuperAdmin(session: Awaited<ReturnType<typeof getSessionOrThrow>>, action: string) {
  return requireSuperAdminAction(session, action);
}

function revalidateAdminUserPaths(userId?: string) {
  revalidatePath('/admin/users');
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

async function emailExists(email: string, excludeUserId?: string): Promise<boolean> {
  const where = excludeUserId
    ? and(eq(users.email, email), ne(users.id, excludeUserId))
    : eq(users.email, email);

  const row = await db.select({ id: users.id }).from(users).where(where).limit(1);
  return row.length > 0;
}

async function syncUserRolesSafe(
  userId: string,
  roleIds: string[],
  assignedBy: string,
): Promise<void> {
  const safety = await assertCanUpdateRoles(userId, roleIds);
  if (!safety.ok) throw new Error(safety.error);

  const current = await queryUserRoleIds(userId);
  const roleRows = await queryAllRoles();
  const roleNameById = new Map(roleRows.map((r) => [r.id, r.name]));

  await db.delete(userRoles).where(eq(userRoles.userId, userId));
  if (roleIds.length > 0) {
    await db.insert(userRoles).values(
      roleIds.map((roleId) => ({
        userId,
        roleId,
        assignedBy,
      })),
    );
  }

  const oldNames = current.map((id) => roleNameById.get(id) ?? id);
  const newNames = roleIds.map((id) => roleNameById.get(id) ?? id);
  const rolesChanged =
    oldNames.length !== newNames.length ||
    oldNames.some((n) => !newNames.includes(n)) ||
    newNames.some((n) => !oldNames.includes(n));

  if (rolesChanged) {
    await createAuditLog({
      userId: assignedBy,
      action: 'user.roles.update',
      resource: 'user',
      resourceId: userId,
      summary: `Cập nhật vai trò: ${formatRoleNames(oldNames)} → ${formatRoleNames(newNames)}`,
      before: { roleNames: oldNames },
      after: { roleNames: newNames },
    });
  }
}

export async function getAdminUsersAction(
  filters: AdminUserFilters = {},
): Promise<ActionResult<SerializedAdminUserListRow[]>> {
  try {
    const session = await getSessionOrThrow();
    await requireSuperAdmin(session, 'list_users');

    const parsed = adminUserFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeAdminUserList(await queryAdminUsers(parsed.data));
    return { success: true, data };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[admin-users] getAdminUsersAction failed', e);
    }
    return {
      success: false,
      error:
        e instanceof Error && e.message === 'Unauthorized'
          ? 'Bạn không có quyền truy cập trang này.'
          : 'Không thể tải danh sách tài khoản. Vui lòng thử lại.',
    };
  }
}

export async function getAdminUserAction(
  id: string,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof queryAdminUserById>>>>> {
  try {
    const session = await getSessionOrThrow();
    await requireSuperAdmin(session, 'view_user');

    const user = await queryAdminUserById(id);
    if (!user) return { success: false, error: 'Không tìm thấy tài khoản' };

    return { success: true, data: user };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tải tài khoản',
    };
  }
}

export async function getRolesAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof queryAllRoles>>>
> {
  try {
    const session = await getSessionOrThrow();
    await requireSuperAdmin(session, 'list_users');

    const data = await queryAllRoles();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tải vai trò',
    };
  }
}

export async function createAdminUserAction(
  input: CreateAdminUserInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSessionOrThrow();
    await requireSuperAdmin(session, 'create_user');

    const parsed = createAdminUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const d = parsed.data;
    const email = d.email.toLowerCase();

    if (await emailExists(email)) {
      return { success: false, error: 'Email đã được sử dụng' };
    }

    const roleRows = await queryAllRoles();
    const validRoleIds = new Set(roleRows.map((r) => r.id));
    if (d.roleIds.some((id) => !validRoleIds.has(id))) {
      return { success: false, error: 'Vai trò không hợp lệ' };
    }

    const roleNames = d.roleIds.map(
      (id) => roleRows.find((r) => r.id === id)?.name ?? id,
    );
    const roleSafety = evaluateCanUpdateRoles({
      targetIsSuperAdmin: false,
      newRoleNames: roleNames,
    });
    if (!roleSafety.ok) return { success: false, error: roleSafety.error };

    const passwordHash = await bcrypt.hash(d.password, 12);
    const phone = d.phone ? normalizePhoneForStorage(d.phone) : null;
    const jobTitle = d.jobTitle?.trim() || null;

    const [created] = await db
      .insert(users)
      .values({
        name: d.name,
        email,
        phone,
        jobTitle,
        passwordHash,
        isActive: d.isActive,
      })
      .returning({ id: users.id });

    await db.insert(userRoles).values(
      d.roleIds.map((roleId) => ({
        userId: created.id,
        roleId,
        assignedBy: session.user.id,
      })),
    );

    await createAuditLog({
      userId: session.user.id,
      action: 'user.create',
      resource: 'user',
      resourceId: created.id,
      summary: `Tạo tài khoản ${d.name} (${email}) — ${formatRoleNames(roleNames)}`,
      after: {
        name: d.name,
        email,
        phone,
        jobTitle,
        isActive: d.isActive,
        roleNames,
      },
    });

    revalidateAdminUserPaths(created.id);
    return { success: true, data: { id: created.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tạo tài khoản',
    };
  }
}

export async function updateAdminUserAction(
  id: string,
  input: UpdateAdminUserInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    await requireSuperAdmin(session, 'update_user');

    const parsed = updateAdminUserSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: ADMIN_USER_VALIDATION_ERROR };
    }

    const existing = await queryAdminUserById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy tài khoản' };

    const d = parsed.data;
    const email = d.email.toLowerCase();

    if (await emailExists(email, id)) {
      return { success: false, error: 'Email đã được sử dụng' };
    }

    const roleRows = await queryAllRoles();
    const validRoleIds = new Set(roleRows.map((r) => r.id));
    if (d.roleIds.some((rid) => !validRoleIds.has(rid))) {
      return { success: false, error: 'Vai trò không hợp lệ' };
    }

    if (d.isActive !== existing.isActive) {
      const activeCheck = await assertCanSetActive(id, d.isActive, session.user.id);
      if (!activeCheck.ok) return { success: false, error: activeCheck.error };
    }

    const roleSafety = await assertCanUpdateRoles(id, d.roleIds);
    if (!roleSafety.ok) return { success: false, error: roleSafety.error };

    const phone = d.phone ? normalizePhoneForStorage(d.phone) : null;
    const jobTitle = d.jobTitle?.trim() || null;

    await db
      .update(users)
      .set({
        name: d.name,
        email,
        phone,
        jobTitle,
        isActive: d.isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    await syncUserRolesSafe(id, d.roleIds, session.user.id);

    const profileChanged =
      d.name !== existing.name ||
      email !== existing.email ||
      phone !== (existing.phone ?? null) ||
      jobTitle !== (existing.jobTitle ?? null) ||
      d.isActive !== existing.isActive;

    if (profileChanged) {
      await createAuditLog({
        userId: session.user.id,
        action: 'user.update',
        resource: 'user',
        resourceId: id,
        summary: `Cập nhật tài khoản ${d.name}`,
        before: {
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          jobTitle: existing.jobTitle,
          isActive: existing.isActive,
        },
        after: {
          name: d.name,
          email,
          phone,
          jobTitle,
          isActive: d.isActive,
        },
      });
    }

    if (d.isActive !== existing.isActive) {
      await createAuditLog({
        userId: session.user.id,
        action: d.isActive
          ? USER_ACTIVE_AUDIT_ACTIONS.activate
          : USER_ACTIVE_AUDIT_ACTIONS.deactivate,
        resource: 'user',
        resourceId: id,
        summary: d.isActive
          ? `Mở khóa tài khoản ${d.name}`
          : `Khóa tài khoản ${d.name}`,
      });
    }

    revalidateAdminUserPaths(id);
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể cập nhật tài khoản',
    };
  }
}

export async function resetAdminUserPasswordAction(
  id: string,
  input: ResetAdminUserPasswordInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    await requireSuperAdmin(session, 'reset_password');

    const parsed = resetAdminUserPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Mật khẩu không hợp lệ',
      };
    }

    const existing = await queryAdminUserById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy tài khoản' };

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'user.password.reset',
      resource: 'user',
      resourceId: id,
      summary: `Đặt lại mật khẩu cho ${existing.name}`,
    });

    revalidateAdminUserPaths(id);
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể đặt lại mật khẩu',
    };
  }
}

export async function setAdminUserActiveAction(
  id: string,
  input: SetAdminUserActiveInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    await requireSuperAdmin(session, 'set_active');

    const parsed = setAdminUserActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Dữ liệu không hợp lệ' };
    }

    const existing = await queryAdminUserById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy tài khoản' };

    if (parsed.data.isActive === existing.isActive) {
      return { success: true, data: undefined };
    }

    const activeCheck = await assertCanSetActive(id, parsed.data.isActive, session.user.id);
    if (!activeCheck.ok) return { success: false, error: activeCheck.error };

    await db
      .update(users)
      .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(eq(users.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: parsed.data.isActive
        ? USER_ACTIVE_AUDIT_ACTIONS.activate
        : USER_ACTIVE_AUDIT_ACTIONS.deactivate,
      resource: 'user',
      resourceId: id,
      summary: parsed.data.isActive
        ? `Mở khóa tài khoản ${existing.name}`
        : `Khóa tài khoản ${existing.name}`,
    });

    revalidateAdminUserPaths(id);
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể cập nhật trạng thái',
    };
  }
}
