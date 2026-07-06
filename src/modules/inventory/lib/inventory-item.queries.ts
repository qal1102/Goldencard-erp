import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems } from '@/db/schema';
import {
  inventoryItemFiltersSchema,
  type InventoryItemFilters,
} from '../schema/inventory-item.schema';

export type InventoryItemListRow = typeof inventoryItems.$inferSelect;

export async function queryInventoryItems(filters: InventoryItemFilters = {}) {
  const parsed = inventoryItemFiltersSchema.parse(filters);
  const q = parsed.q?.trim();

  const where = and(
    parsed.status === 'active'
      ? eq(inventoryItems.isActive, true)
      : parsed.status === 'inactive'
        ? eq(inventoryItems.isActive, false)
        : undefined,
    q
      ? or(
          ilike(inventoryItems.sku, `%${q}%`),
          ilike(inventoryItems.name, `%${q}%`),
          ilike(inventoryItems.category, `%${q}%`),
          ilike(inventoryItems.specification, `%${q}%`),
        )
      : undefined,
  );

  return db
    .select()
    .from(inventoryItems)
    .where(where)
    .orderBy(desc(inventoryItems.isActive), asc(inventoryItems.name))
    .limit(200);
}

export async function queryInventoryItemBySku(sku: string, excludeId?: string) {
  const rows = await db
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(eq(inventoryItems.sku, sku))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (excludeId && row.id === excludeId) return null;
  return row;
}

export async function queryActiveInventoryItemOptions() {
  return db
    .select({
      id: inventoryItems.id,
      sku: inventoryItems.sku,
      name: inventoryItems.name,
      category: inventoryItems.category,
      specification: inventoryItems.specification,
      unit: inventoryItems.unit,
      imageUrl: inventoryItems.imageUrl,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.isActive, true))
    .orderBy(asc(inventoryItems.category), asc(inventoryItems.name))
    .limit(200);
}

export type InventoryItemOption = Awaited<
  ReturnType<typeof queryActiveInventoryItemOptions>
>[number];
