import { sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { quotations } from './quotations';
import { users } from './users';

export const quotationExports = pgTable(
  'quotation_exports',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    format: varchar('format', { length: 20 }).notNull(),
    exportedBy: uuid('exported_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    exportedAt: timestamp('exported_at').defaultNow().notNull(),
  },
  (table) => [
    index('quotation_exports_quotation_id_exported_at_idx').on(
      table.quotationId,
      table.exportedAt,
    ),
  ],
);

export type QuotationExport = typeof quotationExports.$inferSelect;
export type NewQuotationExport = typeof quotationExports.$inferInsert;
