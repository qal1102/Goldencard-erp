import { sql } from 'drizzle-orm';
import {
  index,
  numeric,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { leads } from './leads';
import { quotations } from './quotations';
import { surveys } from './surveys';
import { users } from './users';

export const contractCodeSeq = pgSequence('contract_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 30 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    surveyId: uuid('survey_id').references(() => surveys.id, { onDelete: 'set null' }),
    quotationId: uuid('quotation_id')
      .notNull()
      .unique()
      .references(() => quotations.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 30 }).notNull().default('draft'),
    contractValue: numeric('contract_value', { precision: 15, scale: 2 }).notNull(),
    signedAt: timestamp('signed_at'),
    signedBy: uuid('signed_by').references(() => users.id, { onDelete: 'set null' }),
    signedDocumentUrl: text('signed_document_url'),
    customerSignerName: text('customer_signer_name'),
    goldenCardSignerName: text('golden_card_signer_name'),
    note: text('note'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('contracts_customer_id_idx').on(table.customerId),
    index('contracts_lead_id_idx').on(table.leadId),
    index('contracts_quotation_id_idx').on(table.quotationId),
    index('contracts_status_idx').on(table.status),
  ],
);

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
