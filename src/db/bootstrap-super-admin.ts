import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import {
  createDirectDbClient,
  ensureAdminRole,
  findSuperAdmin,
  findUserByEmail,
  getAdminRoleId,
} from './lib/direct-db';
import { users } from './schema/users';

const MIN_PASSWORD_LENGTH = 6;

type BootstrapArgs = {
  email: string;
  name: string;
  password: string;
  resetPassword: boolean;
};

function parseArgs(): BootstrapArgs {
  const raw = process.argv.slice(2);
  const resetPassword = raw.includes('--reset-password');
  const positional = raw.filter((arg) => arg !== '--reset-password');
  const [email, name, password] = positional;

  if (!email || !name || !password) {
    console.error(
      'Usage: npm run db:bootstrap-super-admin -- <email> "<name>" "<password>" [--reset-password]',
    );
    console.error(
      'Example: npm run db:bootstrap-super-admin -- admin@goldencard.cloud "GoldenCard Root Admin" "StrongPassword123"',
    );
    console.error('');
    console.error('Flags:');
    console.error('  --reset-password  Update password when the user already exists');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    console.error('Invalid email address.');
    process.exit(1);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  return {
    email: normalizedEmail,
    name: name.trim(),
    password,
    resetPassword,
  };
}

function printSuccess(message: string, email: string, name: string): void {
  console.log(message);
  console.log(`  Email       : ${email}`);
  console.log(`  Name        : ${name}`);
  console.log(`  Super Admin : yes`);
  console.log(`  Login URL   : https://goldencard.cloud/login`);
}

async function bootstrapSuperAdmin(): Promise<void> {
  const args = parseArgs();
  const { client, db } = createDirectDbClient();

  try {
    const existingSuper = await findSuperAdmin(db);

    if (existingSuper && existingSuper.email.toLowerCase() === args.email) {
      const adminRoleId = await getAdminRoleId(db);
      const target = await findUserByEmail(db, args.email);
      if (!target) {
        console.error('Super Admin record is inconsistent. Contact support.');
        process.exit(1);
      }

      const updates: {
        name: string;
        isActive: boolean;
        isSuperAdmin: boolean;
        updatedAt: Date;
        passwordHash?: string;
      } = {
        name: args.name,
        isActive: true,
        isSuperAdmin: true,
        updatedAt: new Date(),
      };

      if (args.resetPassword) {
        updates.passwordHash = await bcrypt.hash(args.password, 12);
      }

      await db.update(users).set(updates).where(eq(users.id, target.id));
      await ensureAdminRole(db, target.id, adminRoleId);

      printSuccess(
        args.resetPassword
          ? 'Super Admin already configured. Password updated.'
          : 'Super Admin already configured.',
        args.email,
        args.name,
      );
      return;
    }

    if (existingSuper && existingSuper.email.toLowerCase() !== args.email) {
      console.error(
        `Super Admin already exists (${existingSuper.email}). Only one Super Admin is allowed.`,
      );
      console.error('Refusing to bootstrap another account.');
      process.exit(1);
    }

    const adminRoleId = await getAdminRoleId(db);
    const existingUser = await findUserByEmail(db, args.email);

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(args.password, 12);

      const [created] = await db
        .insert(users)
        .values({
          email: args.email,
          name: args.name,
          passwordHash,
          isActive: true,
          isSuperAdmin: true,
        })
        .returning({ id: users.id });

      await ensureAdminRole(db, created.id, adminRoleId);

      printSuccess('Super Admin created successfully.', args.email, args.name);
      return;
    }

    if (!args.resetPassword && !existingUser.passwordHash) {
      console.error(
        'User exists but has no password. Re-run with --reset-password to set one.',
      );
      process.exit(1);
    }

    const updates: {
      name: string;
      isActive: boolean;
      isSuperAdmin: boolean;
      updatedAt: Date;
      passwordHash?: string;
    } = {
      name: args.name,
      isActive: true,
      isSuperAdmin: true,
      updatedAt: new Date(),
    };

    if (args.resetPassword) {
      updates.passwordHash = await bcrypt.hash(args.password, 12);
    }

    await db.update(users).set(updates).where(eq(users.id, existingUser.id));
    await ensureAdminRole(db, existingUser.id, adminRoleId);

    printSuccess(
      args.resetPassword
        ? 'Existing user promoted to Super Admin. Password updated.'
        : 'Existing user promoted to Super Admin. Password unchanged.',
      args.email,
      args.name,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bootstrap failed.';
    console.error(message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

bootstrapSuperAdmin();
