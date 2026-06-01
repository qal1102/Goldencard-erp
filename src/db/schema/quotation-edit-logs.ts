import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { quotations } from './quotations';
import { users } from './users';

export const quotationEditLogs = pgTable(
  'quotation_edit_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    editedBy: uuid('edited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    editedAt: timestamp('edited_at').defaultNow().notNull(),
    note: text('note').notNull(),
    beforeTotal: numeric('before_total'),
    afterTotal: numeric('after_total'),
    beforeStatus: varchar('before_status'),
    afterStatus: varchar('after_status'),
  },
  (table) => [
    index('quotation_edit_logs_quotation_id_edited_at_idx').on(
      table.quotationId,
      table.editedAt,
    ),
  ],
);

export type QuotationEditLog = typeof quotationEditLogs.$inferSelect;
export type NewQuotationEditLog = typeof quotationEditLogs.$inferInsert;
