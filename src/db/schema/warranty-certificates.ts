import { sql } from 'drizzle-orm';
import {
  index,
  pgSequence,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { contracts } from './contracts';
import { customers } from './customers';
import { handovers } from './handovers';
import { leads } from './leads';
import { quotations } from './quotations';
import { surveys } from './surveys';
import { users } from './users';
import { workOrders } from './work-orders';

export const warrantyCertificateCodeSeq = pgSequence('warranty_certificate_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const warrantyCertificates = pgTable(
  'warranty_certificates',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 30 }).notNull().unique(),
    publicToken: varchar('public_token', { length: 100 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    surveyId: uuid('survey_id').references(() => surveys.id, { onDelete: 'set null' }),
    quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
    contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'set null' }),
    workOrderId: uuid('work_order_id').references(() => workOrders.id, { onDelete: 'set null' }),
    handoverId: uuid('handover_id')
      .notNull()
      .references(() => handovers.id, { onDelete: 'restrict' })
      .unique(),
    status: varchar('status', { length: 30 }).notNull().default('active'),
    warrantyStartAt: timestamp('warranty_start_at'),
    warrantyEndAt: timestamp('warranty_end_at'),
    warrantyTerms: text('warranty_terms'),
    supportPhone: varchar('support_phone', { length: 50 }),
    note: text('note'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('warranty_certificates_customer_id_idx').on(table.customerId),
    index('warranty_certificates_handover_id_idx').on(table.handoverId),
    index('warranty_certificates_status_idx').on(table.status),
    index('warranty_certificates_public_token_idx').on(table.publicToken),
    unique('warranty_certificates_handover_id_unique').on(table.handoverId),
  ],
);

export type WarrantyCertificate = typeof warrantyCertificates.$inferSelect;
export type NewWarrantyCertificate = typeof warrantyCertificates.$inferInsert;
