import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { inventoryItems } from './inventory-items';
import { warehouses } from './warehouses';
import { users } from './users';

export const inventoryStocks = pgTable(
  'inventory_stocks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    quantityOnHand: numeric('quantity_on_hand', { precision: 12, scale: 3 })
      .default('0')
      .notNull(),
    quantityReserved: numeric('quantity_reserved', { precision: 12, scale: 3 })
      .default('0')
      .notNull(),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('inventory_stocks_warehouse_item_uidx').on(table.warehouseId, table.itemId),
    index('inventory_stocks_warehouse_id_idx').on(table.warehouseId),
    index('inventory_stocks_item_id_idx').on(table.itemId),
  ],
);

export type InventoryStock = typeof inventoryStocks.$inferSelect;
export type NewInventoryStock = typeof inventoryStocks.$inferInsert;
