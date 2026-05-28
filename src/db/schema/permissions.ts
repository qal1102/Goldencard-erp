import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    action: varchar('action', { length: 50 }).notNull(),
    resource: varchar('resource', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique('permissions_action_resource_unique').on(table.action, table.resource)],
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
