import 'server-only';

import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems, workOrderMaterials } from '@/db/schema';

export async function queryWorkOrderMaterials(workOrderId: string) {
  return db
    .select({
      id: workOrderMaterials.id,
      workOrderId: workOrderMaterials.workOrderId,
      itemId: workOrderMaterials.itemId,
      itemSku: inventoryItems.sku,
      itemName: inventoryItems.name,
      itemUnit: inventoryItems.unit,
      itemCategory: inventoryItems.category,
      plannedQuantity: workOrderMaterials.plannedQuantity,
      reservedQuantity: workOrderMaterials.reservedQuantity,
      issuedQuantity: workOrderMaterials.issuedQuantity,
      status: workOrderMaterials.status,
      note: workOrderMaterials.note,
      createdAt: workOrderMaterials.createdAt,
      updatedAt: workOrderMaterials.updatedAt,
    })
    .from(workOrderMaterials)
    .innerJoin(inventoryItems, eq(workOrderMaterials.itemId, inventoryItems.id))
    .where(eq(workOrderMaterials.workOrderId, workOrderId))
    .orderBy(asc(inventoryItems.name));
}

export async function queryActiveInventoryItemOptions() {
  return db
    .select({
      id: inventoryItems.id,
      sku: inventoryItems.sku,
      name: inventoryItems.name,
      unit: inventoryItems.unit,
      category: inventoryItems.category,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.isActive, true))
    .orderBy(asc(inventoryItems.name))
    .limit(500);
}

export async function queryWorkOrderMaterialByWorkOrderAndItem(
  workOrderId: string,
  itemId: string,
) {
  return db.query.workOrderMaterials.findFirst({
    where: and(
      eq(workOrderMaterials.workOrderId, workOrderId),
      eq(workOrderMaterials.itemId, itemId),
    ),
    with: {
      item: {
        columns: { sku: true, name: true, unit: true },
      },
    },
  });
}

export type WorkOrderMaterialRow = Awaited<ReturnType<typeof queryWorkOrderMaterials>>[number];
export type InventoryItemOptionRow = Awaited<
  ReturnType<typeof queryActiveInventoryItemOptions>
>[number];
