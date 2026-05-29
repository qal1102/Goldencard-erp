import { sql } from 'drizzle-orm';
import { pgSequence, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { leads } from './leads';
import { users } from './users';

export const customerCodeSeq = pgSequence('customer_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address').notNull(),
  province: varchar('province', { length: 100 }),
  notes: text('notes'),
  // Referral info carried from lead — commission calculation deferred to accounting/finance module (TODO)
  referrerName: varchar('referrer_name', { length: 255 }),
  referrerPhone: varchar('referrer_phone', { length: 20 }),
  referralNote: text('referral_note'),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }).unique(),
  convertedBy: uuid('converted_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
