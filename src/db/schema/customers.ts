import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { leads } from './leads';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
