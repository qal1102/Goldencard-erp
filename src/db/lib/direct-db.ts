import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { roles } from '../schema/roles';
import { userRoles } from '../schema/user-roles';
import { users } from '../schema/users';

config({ path: '.env.local' });

export function getDirectDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) {
    throw new Error(
      'DATABASE_URL_DIRECT is not set. Set it in .env.local or in your shell before running this command.',
    );
  }
  return url;
}

export function createDirectDbClient() {
  const client = postgres(getDirectDatabaseUrl(), { max: 1 });
  const db = drizzle(client);
  return { client, db };
}

export async function findUserByEmail(
  db: ReturnType<typeof drizzle>,
  email: string,
) {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
      isSuperAdmin: users.isSuperAdmin,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  return rows[0] ?? null;
}

export async function findSuperAdmin(db: ReturnType<typeof drizzle>) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAdminRoleId(db: ReturnType<typeof drizzle>): Promise<string> {
  const row = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'admin'))
    .limit(1);

  if (!row[0]) {
    throw new Error('Role "admin" not found. Run "npm run db:seed" first.');
  }

  return row[0].id;
}

export async function ensureAdminRole(
  db: ReturnType<typeof drizzle>,
  userId: string,
  adminRoleId: string,
): Promise<void> {
  const existing = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, adminRoleId)))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(userRoles).values({
    userId,
    roleId: adminRoleId,
  });
}
