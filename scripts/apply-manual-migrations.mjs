import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import postgres from 'postgres';
import { manualMigrationFiles } from './manual-migration-config.mjs';

config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL_DIRECT;
if (!databaseUrl) {
  console.error('DATABASE_URL_DIRECT is not set.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../src/db/migrations');
const sql = postgres(databaseUrl, { max: 1 });

function readStatements(fileName) {
  const filePath = path.join(migrationsDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  await sql`select pg_advisory_lock(hashtext('goldencard_manual_migrations'))`;
  try {
    for (const fileName of manualMigrationFiles) {
      const statements = readStatements(fileName);
      for (const statement of statements) {
        await sql.unsafe(statement);
      }
      console.log(`applied ${fileName}`);
    }
  } finally {
    await sql`select pg_advisory_unlock(hashtext('goldencard_manual_migrations'))`;
    await sql.end();
  }
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await sql.end();
  } catch {
    // Ignore close errors.
  }
  process.exit(1);
});
