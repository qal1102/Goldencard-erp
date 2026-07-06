import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { inventoryItems } from './inventory-items';
import { users } from './users';

export const quotationPriceCatalog = pgTable(
  'quotation_price_catalog',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    inventoryItemId: uuid('inventory_item_id').references(() => inventoryItems.id, {
      onDelete: 'set null',
    }),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 120 }),
    unit: varchar('unit', { length: 50 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).default('0').notNull(),
    isMainEquipment: boolean('is_main_equipment').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('quotation_price_catalog_inventory_item_uidx')
      .on(table.inventoryItemId)
      .where(sql`${table.inventoryItemId} is not null`),
    index('quotation_price_catalog_category_idx').on(table.category),
    index('quotation_price_catalog_is_active_idx').on(table.isActive),
  ],
);

export type QuotationPriceCatalogItem = typeof quotationPriceCatalog.$inferSelect;
export type NewQuotationPriceCatalogItem = typeof quotationPriceCatalog.$inferInsert;
