/**
 * Benchmark login DB steps (no password). Run: npx tsx scripts/measure-login.ts
 */
import { config } from 'dotenv';
import { performance } from 'node:perf_hooks';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  const result = await fn();
  console.log(`${label}: ${Math.round(performance.now() - t0)}ms`);
  return result;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  const { db } = await import('../src/db');
  const { users } = await import('../src/db/schema/users');
  const { userRoles } = await import('../src/db/schema/user-roles');
  const { roles } = await import('../src/db/schema/roles');

  const sample = await time('userQuery', () =>
    db.query.users.findFirst({
      where: eq(users.isActive, true),
      columns: { id: true, email: true, passwordHash: true },
    }),
  );

  if (!sample?.passwordHash) {
    console.error('No active user with password_hash found');
    process.exit(1);
  }

  await time('bcryptCompare', () => bcrypt.compare('wrong-password', sample.passwordHash!));

  await time('rolesQuery', () =>
    db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, sample.id)),
  );

  await time('lastLoginUpdate(blocking)', () =>
    db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, sample.id)),
  );

  console.log('Done — compare with login-perf logs during real sign-in.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
