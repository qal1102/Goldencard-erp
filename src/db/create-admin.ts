import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import {
  createDirectDbClient,
  ensureAdminRole,
  findUserByEmail,
  getAdminRoleId,
} from './lib/direct-db';
import { users } from './schema/users';

config({ path: '.env.local' });

async function createAdmin() {
  const [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    console.error(
      'Usage: npm run db:create-admin -- <email> "<name>" <password>',
    );
    console.error('Example: npm run db:create-admin -- admin@example.com "Admin" secret123');
    console.error('');
    console.error('For the single Root Super Admin account, prefer:');
    console.error(
      '  npm run db:bootstrap-super-admin -- admin@example.com "Root Admin" "YourPassword"',
    );
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { client, db } = createDirectDbClient();

  try {
    const existing = await findUserByEmail(db, normalizedEmail);
    if (existing) {
      console.log(`User with email "${normalizedEmail}" already exists. Skipping.`);
      console.log('To promote to Super Admin, run:');
      console.log(`  npm run db:bootstrap-super-admin -- ${normalizedEmail} "${name}" "<password>" --reset-password`);
      return;
    }

    const adminRoleId = await getAdminRoleId(db);
    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        isActive: true,
      })
      .returning({ id: users.id });

    await ensureAdminRole(db, user.id, adminRoleId);

    console.log('Admin user created (not Super Admin):');
    console.log(`  Email : ${normalizedEmail}`);
    console.log(`  Name  : ${name.trim()}`);
    console.log(`  Role  : admin`);
    console.log('');
    console.log('To make this the Root Super Admin, run:');
    console.log(
      `  npm run db:bootstrap-super-admin -- ${normalizedEmail} "${name.trim()}" "<password>" --reset-password`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create admin failed.';
    console.error(message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();
