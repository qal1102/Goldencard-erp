import { sql } from 'drizzle-orm';
import { index, pgSequence, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const leadCodeSeq = pgSequence('lead_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const leads = pgTable(
  'leads',
  {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  customerId: uuid('customer_id'),
  email: varchar('email', { length: 255 }),
  address: text('address').notNull(),
  province: varchar('province', { length: 100 }),
  source: varchar('source', { length: 50 }).notNull().default('direct'),
  status: varchar('status', { length: 50 }).notNull().default('new'),
  expectedCapacity: varchar('expected_capacity', { length: 50 }),
  notes: text('notes'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  lostReason: text('lost_reason'),
  lostAt: timestamp('lost_at'),
  wonAt: timestamp('won_at'),
  convertedAt: timestamp('converted_at'),
  convertedBy: uuid('converted_by').references(() => users.id, { onDelete: 'set null' }),
  // Referral info — commission calculation deferred to accounting/finance module (TODO)
  referrerName: varchar('referrer_name', { length: 255 }),
  referrerPhone: varchar('referrer_phone', { length: 20 }),
  referralNote: text('referral_note'),
  consultationNote: text('consultation_note'),
  customerRequirements: text('customer_requirements'),
  preferredInstallTime: text('preferred_install_time'),
  followUpAt: timestamp('follow_up_at'),
  lastContactedAt: timestamp('last_contacted_at'),
  lastContactedBy: uuid('last_contacted_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  lastCallResult: varchar('last_call_result', { length: 50 }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('leads_customer_id_idx').on(table.customerId),
    index('leads_phone_idx').on(table.phone),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
