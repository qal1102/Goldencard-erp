import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { manualMigrationFiles } from './manual-migration-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../src/db/migrations');

const blockedPatterns = [
  /\bdrop\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+["\w.]+\s+set\b/i,
  /\balter\s+table\s+"?(leads|customers|contracts)"?\b/i,
  /\balter\s+table\s+"?quotations"?\b(?![\s\S]*\badd\s+column\s+if\s+not\s+exists\b\s+"?inventory_item_id"?)/i,
];

const allowedPatterns = [
  /^\s*create\s+table\s+if\s+not\s+exists\b/i,
  /^\s*create\s+(unique\s+)?index\s+if\s+not\s+exists\b/i,
  /^\s*alter\s+table\s+"?inventory_/i,
  /^\s*alter\s+table\s+"?work_order_materials"?/i,
  /^\s*alter\s+table\s+"?quotation_items"?\s+add\s+column\s+if\s+not\s+exists\s+"?inventory_item_id"?/i,
  /^\s*alter\s+table\s+"?users"?\s+add\s+column\s+if\s+not\s+exists\s+job_title\b/i,
  /^\s*insert\s+into\s+roles\b[\s\S]*\bon\s+conflict\b[\s\S]*\bdo\s+nothing\b/i,
  /^\s*do\s+\$\$\s+begin[\s\S]*duplicate_object[\s\S]*end\s+\$\$/i,
];

function splitStatements(raw) {
  return raw
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function assertStatementSafe(fileName, statement, index) {
  const compact = statement.replace(/\s+/g, ' ').trim();
  const blocked = blockedPatterns.find((pattern) => pattern.test(statement));
  if (blocked) {
    throw new Error(`${fileName} statement ${index + 1} is blocked: ${compact}`);
  }

  const allowed = allowedPatterns.some((pattern) => pattern.test(statement));
  if (!allowed) {
    throw new Error(`${fileName} statement ${index + 1} is not in the manual migration allowlist: ${compact}`);
  }
}

for (const fileName of manualMigrationFiles) {
  const filePath = path.join(migrationsDir, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing migration file: ${fileName}`);
  }

  const statements = splitStatements(fs.readFileSync(filePath, 'utf8'));
  if (statements.length === 0) {
    throw new Error(`Migration file has no statements: ${fileName}`);
  }

  statements.forEach((statement, index) => assertStatementSafe(fileName, statement, index));
}

console.log('Manual migration safety check passed.');
