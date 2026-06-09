import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sku: varchar('sku', { length: 80 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 120 }),
    unit: varchar('unit', { length: 50 }).notNull(),
    minStock: numeric('min_stock', { precision: 12, scale: 3 }).default('0').notNull(),
    isSerializable: boolean('is_serializable').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('inventory_items_name_idx').on(table.name),
    index('inventory_items_category_idx').on(table.category),
    index('inventory_items_is_active_idx').on(table.isActive),
    index('inventory_items_created_at_idx').on(table.createdAt),
  ],
);

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
