import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { roles } from './schema/roles';
import { userRoles } from './schema/user-roles';
import { users } from './schema/users';

config({ path: '.env.local' });

async function createAdmin() {
  const [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    console.error(
      'Usage: npm run db:create-admin -- <email> "<name>" <password>',
    );
    console.error('Example: npm run db:create-admin -- admin@example.com "Admin" secret123');
    process.exit(1);
  }

  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) {
    console.error('DATABASE_URL_DIRECT is not set in .env.local');
    process.exit(1);
  }

  const client = postgres(url);
  const db = drizzle(client);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`User with email "${email}" already exists. Skipping.`);
    await client.end();
    return;
  }

  const adminRole = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'admin'))
    .limit(1);

  if (adminRole.length === 0) {
    console.error('Role "admin" not found. Run "npm run db:seed" first.');
    await client.end();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash, isActive: true })
    .returning({ id: users.id });

  await db.insert(userRoles).values({
    userId: user.id,
    roleId: adminRole[0].id,
  });

  console.log('Admin user created:');
  console.log(`  Email : ${email}`);
  console.log(`  Name  : ${name}`);
  console.log(`  Role  : admin`);

  await client.end();
}

createAdmin().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
