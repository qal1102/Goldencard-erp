import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { leads } from './leads';
import { users } from './users';

export const leadActivities = pgTable('lead_activities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  content: text('content').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type LeadActivity = typeof leadActivities.$inferSelect;
export type NewLeadActivity = typeof leadActivities.$inferInsert;
