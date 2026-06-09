import { serializeWarehouses } from './warehouse-serialize';
import { queryInventoryStockRows, queryWarehouses } from './warehouse.queries';
import type { WarehouseFilters } from '../schema/warehouse.schema';

export type SerializedInventoryStockRow = {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  itemUnit: string;
  itemCategory: string | null;
  quantityOnHand: string;
  quantityReserved: string;
  updatedAt: string;
};

function serializeInventoryStockRows(
  rows: Awaited<ReturnType<typeof queryInventoryStockRows>>,
): SerializedInventoryStockRow[] {
  return rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export type LoadWarehousesResult =
  | { success: true; data: ReturnType<typeof serializeWarehouses> }
  | { success: false; error: string };

export type LoadInventoryStocksResult =
  | { success: true; data: SerializedInventoryStockRow[] }
  | { success: false; error: string };

export async function loadWarehousesList(
  filters: WarehouseFilters = {},
): Promise<LoadWarehousesResult> {
  try {
    const rows = await queryWarehouses(filters);
    return { success: true, data: serializeWarehouses(rows) };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[inventory] loadWarehousesList failed', e);
    }
    return {
      success: false,
      error: 'Không thể tải danh sách kho. Vui lòng thử lại.',
    };
  }
}

export async function loadInventoryStocksList(): Promise<LoadInventoryStocksResult> {
  try {
    const rows = await queryInventoryStockRows();
    return { success: true, data: serializeInventoryStockRows(rows) };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[inventory] loadInventoryStocksList failed', e);
    }
    return {
      success: false,
      error: 'Không thể tải tồn kho. Vui lòng thử lại.',
    };
  }
}
