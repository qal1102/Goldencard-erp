import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { inventoryItems } from './inventory-items';
import { warehouses } from './warehouses';
import { workOrders } from './work-orders';
import { users } from './users';

export const inventoryStockMovements = pgTable(
  'inventory_stock_movements',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    type: varchar('type', { length: 20 }).notNull(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    workOrderId: uuid('work_order_id').references(() => workOrders.id, {
      onDelete: 'set null',
    }),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    quantityBefore: numeric('quantity_before', { precision: 12, scale: 3 }).notNull(),
    quantityAfter: numeric('quantity_after', { precision: 12, scale: 3 }).notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('inventory_stock_movements_warehouse_id_idx').on(table.warehouseId),
    index('inventory_stock_movements_item_id_idx').on(table.itemId),
    index('inventory_stock_movements_work_order_id_idx').on(table.workOrderId),
    index('inventory_stock_movements_type_idx').on(table.type),
    index('inventory_stock_movements_created_at_idx').on(table.createdAt),
  ],
);

export type InventoryStockMovement = typeof inventoryStockMovements.$inferSelect;
export type NewInventoryStockMovement = typeof inventoryStockMovements.$inferInsert;
