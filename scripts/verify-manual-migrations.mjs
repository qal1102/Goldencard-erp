import { config } from 'dotenv';
import postgres from 'postgres';
import { requiredSchemaChecks } from './manual-migration-config.mjs';

config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL_DIRECT;
if (!databaseUrl) {
  console.error('DATABASE_URL_DIRECT is not set.');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

function key(tableName, columnName) {
  return `${tableName}.${columnName}`;
}

async function main() {
  const tables = await sql.unsafe(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `);
  const columns = await sql.unsafe(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
  `);
  const indexes = await sql.unsafe(`
    select indexname
    from pg_indexes
    where schemaname = 'public'
  `);
  const constraints = await sql.unsafe(`
    select conname
    from pg_constraint
  `);

  const tableSet = new Set(tables.map((row) => row.table_name));
  const columnSet = new Set(columns.map((row) => key(row.table_name, row.column_name)));
  const indexSet = new Set(indexes.map((row) => row.indexname));
  const constraintSet = new Set(constraints.map((row) => row.conname));

  const missing = [
    ...requiredSchemaChecks.tables
      .filter((tableName) => !tableSet.has(tableName))
      .map((tableName) => `table:${tableName}`),
    ...requiredSchemaChecks.columns
      .filter(([tableName, columnName]) => !columnSet.has(key(tableName, columnName)))
      .map(([tableName, columnName]) => `column:${tableName}.${columnName}`),
    ...requiredSchemaChecks.indexes
      .filter((indexName) => !indexSet.has(indexName))
      .map((indexName) => `index:${indexName}`),
    ...requiredSchemaChecks.constraints
      .filter((constraintName) => !constraintSet.has(constraintName))
      .map((constraintName) => `constraint:${constraintName}`),
  ];

  if (missing.length > 0) {
    console.error('Manual migration verification failed:');
    for (const item of missing) console.error(`- ${item}`);
    process.exitCode = 1;
  } else {
    console.log('Manual migration verification passed.');
  }

  await sql.end();
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
