import { sql } from 'drizzle-orm';
import {
  date,
  numeric,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { surveys } from './surveys';
import { users } from './users';

export const quotationCodeSeq = pgSequence('quotation_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const quotations = pgTable('quotations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).notNull().unique(),
  // nullable — null when the quotation originates from a lead-origin survey
  // (no Customer record exists yet). Set to the customer id after lead conversion.
  customerId: uuid('customer_id')
    .references(() => customers.id, { onDelete: 'restrict' }),
  // TEMPORARY MVP constraint: one quotation per survey.
  // Drop this UNIQUE when quotation revisions are introduced and replace with
  // a revision_number column + composite UNIQUE on (survey_id, revision_number).
  surveyId: uuid('survey_id')
    .notNull()
    .unique()
    .references(() => surveys.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  validUntil: date('valid_until'),
  note: text('note'),
  // Snapshot fields — written once at creation from the customer record.
  // Must never be overwritten by update actions.
  customerNameSnapshot: varchar('customer_name_snapshot', { length: 255 }).notNull(),
  customerPhoneSnapshot: varchar('customer_phone_snapshot', { length: 50 }),
  customerAddressSnapshot: text('customer_address_snapshot'),
  // Financials — always computed server-side, never trusted from the client.
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  taxAmount: numeric('tax_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  grandTotal: numeric('grand_total', { precision: 15, scale: 2 }).notNull().default('0'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  // Acceptance audit — set automatically when status transitions to 'accepted'.
  acceptedAt: timestamp('accepted_at'),
  acceptedBy: uuid('accepted_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;
