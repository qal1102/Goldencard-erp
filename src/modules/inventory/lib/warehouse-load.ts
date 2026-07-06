import { serializeWarehouses } from './warehouse-serialize';
import {
  queryInventoryStockMovementRows,
  queryInventoryStockRows,
  queryInventoryWorkOrderOptions,
  queryWarehouses,
} from './warehouse.queries';
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

export type SerializedInventoryStockMovementRow = {
  id: string;
  documentCode: string | null;
  type: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  itemUnit: string;
  workOrderId: string | null;
  workOrderCode: string | null;
  quantity: string;
  quantityBefore: string;
  quantityAfter: string;
  note: string | null;
  createdAt: string;
};

export type SerializedInventoryWorkOrderOption = {
  id: string;
  code: string;
  status: string;
  customerName: string;
  contractCode: string | null;
};

function serializeInventoryStockRows(
  rows: Awaited<ReturnType<typeof queryInventoryStockRows>>,
): SerializedInventoryStockRow[] {
  return rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export function serializeInventoryStockMovementRows(
  rows: Awaited<ReturnType<typeof queryInventoryStockMovementRows>>,
): SerializedInventoryStockMovementRow[] {
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export type LoadWarehousesResult =
  | { success: true; data: ReturnType<typeof serializeWarehouses> }
  | { success: false; error: string };

export type LoadInventoryStocksResult =
  | { success: true; data: SerializedInventoryStockRow[] }
  | { success: false; error: string };

export type LoadInventoryStockMovementsResult =
  | { success: true; data: SerializedInventoryStockMovementRow[] }
  | { success: false; error: string };

export type LoadInventoryWorkOrderOptionsResult =
  | { success: true; data: SerializedInventoryWorkOrderOption[] }
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

export async function loadInventoryStockMovementsList(): Promise<LoadInventoryStockMovementsResult> {
  try {
    const rows = await queryInventoryStockMovementRows();
    return { success: true, data: serializeInventoryStockMovementRows(rows) };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[inventory] loadInventoryStockMovementsList failed', e);
    }
    return {
      success: false,
      error: 'Không thể tải lịch sử kho. Vui lòng thử lại.',
    };
  }
}

export async function loadInventoryWorkOrderOptions(): Promise<LoadInventoryWorkOrderOptionsResult> {
  try {
    const rows = await queryInventoryWorkOrderOptions();
    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        status: row.status,
        customerName: row.customer.fullName,
        contractCode: row.contract?.code ?? null,
      })),
    };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[inventory] loadInventoryWorkOrderOptions failed', e);
    }
    return {
      success: false,
      error: 'Không thể tải danh sách lệnh thi công. Vui lòng thử lại.',
    };
  }
}
