import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  postgresClient?: ReturnType<typeof postgres>;
};

function getPoolMax() {
  const fallback = process.env.VERCEL ? 1 : 10;
  const configured = process.env.DB_POOL_MAX;
  if (!configured) return fallback;

  const parsed = Number(configured);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createPostgresClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  return postgres(url, {
    // Supabase transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    max: getPoolMax(),
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const client = globalForDb.postgresClient ?? createPostgresClient();

if (!globalForDb.postgresClient) {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
