import { sql } from 'drizzle-orm';
import {
  check,
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
import { workOrders } from './work-orders';

export const workOrderMaterials = pgTable(
  'work_order_materials',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    plannedQuantity: numeric('planned_quantity', { precision: 12, scale: 3 }).notNull(),
    reservedQuantity: numeric('reserved_quantity', { precision: 12, scale: 3 })
      .default('0')
      .notNull(),
    issuedQuantity: numeric('issued_quantity', { precision: 12, scale: 3 }).default('0').notNull(),
    status: varchar('status', { length: 20 }).default('planned').notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('work_order_materials_work_order_item_uidx').on(
      table.workOrderId,
      table.itemId,
    ),
    index('work_order_materials_work_order_id_idx').on(table.workOrderId),
    index('work_order_materials_item_id_idx').on(table.itemId),
    index('work_order_materials_status_idx').on(table.status),
    check('work_order_materials_planned_quantity_check', sql`${table.plannedQuantity} > 0`),
    check(
      'work_order_materials_reserved_quantity_check',
      sql`${table.reservedQuantity} >= 0`,
    ),
    check('work_order_materials_issued_quantity_check', sql`${table.issuedQuantity} >= 0`),
    check(
      'work_order_materials_status_check',
      sql`${table.status} in ('planned', 'approved', 'partially_issued', 'issued', 'cancelled')`,
    ),
  ],
);

export type WorkOrderMaterial = typeof workOrderMaterials.$inferSelect;
export type NewWorkOrderMaterial = typeof workOrderMaterials.$inferInsert;
