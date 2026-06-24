import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { roles } from './schema/roles';

config({ path: '.env.local' });

const ROLES: { name: string; description: string }[] = [
  { name: 'admin', description: 'Full system access' },
  { name: 'director', description: 'Executive oversight and approvals' },
  { name: 'sales', description: 'CRM, leads, quotations' },
  { name: 'project_manager', description: 'Project management, technical coordination, delivery oversight' },
  { name: 'chief_engineer', description: 'Chief engineer, technical review, survey and installation oversight' },
  { name: 'technician', description: 'Survey, BOM, work orders, installation' },
  { name: 'chief_accountant', description: 'Finance, approvals, contract sign-off' },
  { name: 'accountant', description: 'Finance operations, MISA export' },
  { name: 'customer_service', description: 'After-sales, warranty, incident handling' },
];

async function seed() {
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) {
    console.error('DATABASE_URL_DIRECT is not set in .env.local');
    process.exit(1);
  }

  const client = postgres(url);
  const db = drizzle(client);

  console.log('Seeding roles...');

  for (const role of ROLES) {
    await db
      .insert(roles)
      .values(role)
      .onConflictDoNothing({ target: roles.name });
    console.log(`  + ${role.name}`);
  }

  console.log('Done.');
  await client.end();
}

seed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
