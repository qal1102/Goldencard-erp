import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { createDirectDbClient, findSuperAdmin, findUserByEmail } from './lib/direct-db';
import { users } from './schema/users';

config({ path: '.env.local' });

async function promoteSuperAdmin() {
  const emailArg = process.argv[2];
  const email = (emailArg ?? process.env.SUPER_ADMIN_EMAIL)?.trim().toLowerCase();

  if (!email) {
    console.error('Usage: npm run db:promote-super-admin -- <email>');
    console.error('   or: SUPER_ADMIN_EMAIL=admin@example.com npm run db:promote-super-admin');
    console.error('');
    console.error('Prefer the full bootstrap command instead:');
    console.error(
      '  npm run db:bootstrap-super-admin -- admin@example.com "Root Admin" "YourPassword"',
    );
    process.exit(1);
  }

  const { client, db } = createDirectDbClient();

  try {
    const existingSuper = await findSuperAdmin(db);

    if (existingSuper) {
      if (existingSuper.email.toLowerCase() === email) {
        console.log(`Super Admin already set: ${existingSuper.email}`);
        return;
      }

      console.error(
        `Super Admin already exists (${existingSuper.email}). Only one Super Admin is allowed.`,
      );
      console.error('Refusing to promote another account.');
      process.exit(1);
    }

    const target = await findUserByEmail(db, email);
    if (!target) {
      console.error(`No user found with email "${email}".`);
      console.error('Use bootstrap instead:');
      console.error(
        `  npm run db:bootstrap-super-admin -- ${email} "Root Admin" "YourPassword"`,
      );
      process.exit(1);
    }

    await db
      .update(users)
      .set({ isSuperAdmin: true, isActive: true, updatedAt: new Date() })
      .where(eq(users.id, target.id));

    console.log('Super Admin promoted successfully:');
    console.log(`  Email : ${target.email}`);
    console.log(`  Name  : ${target.name}`);
    console.log('');
    console.log('If you also need to set or reset the password, run:');
    console.log(
      `  npm run db:bootstrap-super-admin -- ${email} "${target.name}" "YourPassword" --reset-password`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Promote failed.';
    console.error(message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

promoteSuperAdmin();
