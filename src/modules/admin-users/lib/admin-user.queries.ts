import 'server-only';

import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { roles, userRoles, users } from '@/db/schema';
import type { AdminUserFilters } from '../schema/admin-user.schema';

export async function queryAllRoles() {
  return db.select().from(roles).orderBy(roles.name);
}

export async function queryAdminUsers(filters: AdminUserFilters = {}) {
  const conditions = [];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(ilike(users.name, term), ilike(users.email, term), ilike(users.phone, term)),
    );
  }

  if (filters.roleId) {
    conditions.push(
      sql`${users.id} IN (
        SELECT ${userRoles.userId} FROM ${userRoles}
        WHERE ${userRoles.roleId} = ${filters.roleId}
      )`,
    );
  }

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      isSuperAdmin: users.isSuperAdmin,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt));

  if (userRows.length === 0) return [];

  const userIds = userRows.map((u) => u.id);
  const roleRows = await db
    .select({
      userId: userRoles.userId,
      roleId: roles.id,
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds));

  const rolesByUser = new Map<string, { id: string; name: string }[]>();
  for (const row of roleRows) {
    const list = rolesByUser.get(row.userId) ?? [];
    list.push({ id: row.roleId, name: row.roleName });
    rolesByUser.set(row.userId, list);
  }

  return userRows.map((user) => ({
    ...user,
    roles: rolesByUser.get(user.id) ?? [],
  }));
}

export async function queryAdminUserById(id: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      isSuperAdmin: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) return null;

  const roleRows = await db
    .select({
      roleId: roles.id,
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, id));

  return {
    ...user,
    roles: roleRows.map((r) => ({ id: r.roleId, name: r.roleName })),
  };
}

export async function queryUserRoleIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.roleId);
}

export type AdminUserListRow = Awaited<ReturnType<typeof queryAdminUsers>>[number];
export type AdminUserDetail = NonNullable<Awaited<ReturnType<typeof queryAdminUserById>>>;
