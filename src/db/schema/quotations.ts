import { sql } from 'drizzle-orm';
import {
  date,
  integer,
  numeric,
  pgSequence,
  pgTable,
  text,
  timestamp,
  unique,
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

export const quotations = pgTable(
  'quotations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 20 }).notNull().unique(),
    // nullable — null when the quotation originates from a lead-origin survey
    // (no Customer record exists yet). Set to the customer id after lead conversion.
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'restrict' }),
    revisionNumber: integer('revision_number').notNull().default(1),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    validUntil: date('valid_until'),
    note: text('note'),
    // Snapshot fields — written once at creation from the customer record.
    // Must never be overwritten by update actions.
    customerNameSnapshot: varchar('customer_name_snapshot', { length: 255 }).notNull(),
    customerPhoneSnapshot: varchar('customer_phone_snapshot', { length: 50 }),
    customerAddressSnapshot: text('customer_address_snapshot'),
    // Discount / VAT inputs — persisted for faithful export and revision cloning.
    discountType: varchar('discount_type', { length: 20 }),
    discountValue: numeric('discount_value', { precision: 15, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }),
    // Financials — always computed server-side, never trusted from the client.
    subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    taxAmount: numeric('tax_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    grandTotal: numeric('grand_total', { precision: 15, scale: 2 }).notNull().default('0'),
    // Content lock — set on first export; prevents further edits without creating a revision.
    contentLockedAt: timestamp('content_locked_at'),
    // Send audit — recorded when staff marks quotation as sent to customer off-system.
    sentAt: timestamp('sent_at'),
    sentBy: uuid('sent_by').references(() => users.id, { onDelete: 'set null' }),
    sentChannel: varchar('sent_channel', { length: 20 }),
    sentNote: text('sent_note'),
    // Customer response audit — recorded by staff after off-system customer feedback.
    responseNote: text('response_note'),
    respondedAt: timestamp('responded_at'),
    respondedBy: uuid('responded_by').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    // Acceptance audit — set automatically when status transitions to 'accepted'.
    acceptedAt: timestamp('accepted_at'),
    acceptedBy: uuid('accepted_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('quotations_survey_id_revision_number_unique').on(
      table.surveyId,
      table.revisionNumber,
    ),
  ],
);

export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;
