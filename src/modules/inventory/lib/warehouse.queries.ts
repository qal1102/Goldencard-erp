import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  inventoryItems,
  inventoryStockMovements,
  inventoryStocks,
  workOrders,
  warehouses,
} from '@/db/schema';
import {
  type WarehouseFilters,
  warehouseFiltersSchema,
} from '../schema/warehouse.schema';

export async function queryWarehouses(filters: WarehouseFilters = {}) {
  const parsed = warehouseFiltersSchema.parse(filters);
  const where = and(
    parsed.status === 'active'
      ? eq(warehouses.isActive, true)
      : parsed.status === 'inactive'
        ? eq(warehouses.isActive, false)
        : undefined,
  );

  return db
    .select()
    .from(warehouses)
    .where(where)
    .orderBy(desc(warehouses.isActive), asc(warehouses.name))
    .limit(100);
}

export async function queryWarehouseByCode(code: string, excludeId?: string) {
  const rows = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(eq(warehouses.code, code))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (excludeId && row.id === excludeId) return null;
  return row;
}

export async function queryInventoryStockRows() {
  return db
    .select({
      id: inventoryStocks.id,
      warehouseId: warehouses.id,
      warehouseCode: warehouses.code,
      warehouseName: warehouses.name,
      itemId: inventoryItems.id,
      itemSku: inventoryItems.sku,
      itemName: inventoryItems.name,
      itemUnit: inventoryItems.unit,
      itemCategory: inventoryItems.category,
      quantityOnHand: inventoryStocks.quantityOnHand,
      quantityReserved: inventoryStocks.quantityReserved,
      updatedAt: inventoryStocks.updatedAt,
    })
    .from(inventoryStocks)
    .innerJoin(warehouses, eq(inventoryStocks.warehouseId, warehouses.id))
    .innerJoin(inventoryItems, eq(inventoryStocks.itemId, inventoryItems.id))
    .orderBy(asc(warehouses.name), asc(inventoryItems.name))
    .limit(500);
}

export type InventoryStockListRow = Awaited<
  ReturnType<typeof queryInventoryStockRows>
>[number];

export async function queryInventoryStockMovementRows() {
  return db
    .select({
      id: inventoryStockMovements.id,
      type: inventoryStockMovements.type,
      warehouseId: warehouses.id,
      warehouseCode: warehouses.code,
      warehouseName: warehouses.name,
      itemId: inventoryItems.id,
      itemSku: inventoryItems.sku,
      itemName: inventoryItems.name,
      itemUnit: inventoryItems.unit,
      workOrderId: workOrders.id,
      workOrderCode: workOrders.code,
      quantity: inventoryStockMovements.quantity,
      quantityBefore: inventoryStockMovements.quantityBefore,
      quantityAfter: inventoryStockMovements.quantityAfter,
      note: inventoryStockMovements.note,
      createdAt: inventoryStockMovements.createdAt,
    })
    .from(inventoryStockMovements)
    .innerJoin(warehouses, eq(inventoryStockMovements.warehouseId, warehouses.id))
    .innerJoin(inventoryItems, eq(inventoryStockMovements.itemId, inventoryItems.id))
    .leftJoin(workOrders, eq(inventoryStockMovements.workOrderId, workOrders.id))
    .orderBy(desc(inventoryStockMovements.createdAt))
    .limit(100);
}

export type InventoryStockMovementListRow = Awaited<
  ReturnType<typeof queryInventoryStockMovementRows>
>[number];

export async function queryInventoryWorkOrderOptions() {
  return db.query.workOrders.findMany({
    columns: {
      id: true,
      code: true,
      status: true,
    },
    with: {
      customer: {
        columns: {
          fullName: true,
        },
      },
      contract: {
        columns: {
          code: true,
        },
      },
    },
    orderBy: [desc(workOrders.createdAt)],
    limit: 100,
  });
}
