'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { inventoryItems, inventoryStocks, warehouses } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireSuperAdminAction } from '@/lib/auth/super-admin';
import { serializeWarehouses } from '../lib/warehouse-serialize';
import {
  queryInventoryStockRows,
  queryWarehouseByCode,
  queryWarehouses,
} from '../lib/warehouse.queries';
import {
  type InventoryStockAdjustmentInput,
  type WarehouseFilters,
  type WarehouseFormInput,
  inventoryStockAdjustmentSchema,
  warehouseFiltersSchema,
  warehouseFormSchema,
} from '../schema/warehouse.schema';

export type WarehouseActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireWarehouseAdmin(action: string) {
  const session = await auth();
  await requireSuperAdminAction(session, action);
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function revalidateInventory() {
  revalidatePath('/inventory');
}

function serializeInventoryStockRows(
  rows: Awaited<ReturnType<typeof queryInventoryStockRows>>,
) {
  return rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

function isDuplicateWarehouseCodeError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const dbError = error as {
    code?: string;
    constraint_name?: string;
    constraint?: string;
  };

  return (
    dbError.code === '23505' &&
    (dbError.constraint_name === 'warehouses_code_unique' ||
      dbError.constraint === 'warehouses_code_unique')
  );
}

export async function getWarehousesAction(
  filters: WarehouseFilters = {},
): Promise<WarehouseActionResult<ReturnType<typeof serializeWarehouses>>> {
  try {
    await requireWarehouseAdmin('inventory.warehouses.list');

    const parsed = warehouseFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: 'Bộ lọc kho không hợp lệ' };
    }

    const rows = await queryWarehouses(parsed.data);
    return { success: true, data: serializeWarehouses(rows) };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error && e.message === 'Unauthorized'
          ? 'Bạn không có quyền quản lý kho.'
          : 'Không thể tải danh sách kho. Vui lòng thử lại.',
    };
  }
}

export async function getInventoryStocksAction(): Promise<
  WarehouseActionResult<ReturnType<typeof serializeInventoryStockRows>>
> {
  try {
    await requireWarehouseAdmin('inventory.stocks.list');
    const rows = await queryInventoryStockRows();
    return { success: true, data: serializeInventoryStockRows(rows) };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error && e.message === 'Unauthorized'
          ? 'Bạn không có quyền xem tồn kho.'
          : 'Không thể tải tồn kho. Vui lòng thử lại.',
    };
  }
}

export async function createWarehouseAction(
  input: WarehouseFormInput,
): Promise<WarehouseActionResult<{ id: string }>> {
  try {
    const session = await requireWarehouseAdmin('inventory.warehouses.create');

    const parsed = warehouseFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu kho không hợp lệ',
      };
    }

    const d = parsed.data;
    const code = normalizeCode(d.code);
    if (await queryWarehouseByCode(code)) {
      return { success: false, error: 'Mã kho đã tồn tại' };
    }

    const [created] = await db
      .insert(warehouses)
      .values({
        code,
        name: d.name,
        address: normalizeOptional(d.address),
        note: normalizeOptional(d.note),
        isActive: d.isActive,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: warehouses.id });

    await createAuditLog({
      userId: session.user.id,
      action: 'inventory.warehouse.create',
      resource: 'warehouse',
      resourceId: created.id,
      summary: `Tạo kho ${code} - ${d.name}`,
      after: {
        code,
        name: d.name,
        isActive: d.isActive,
      },
    });

    revalidateInventory();
    return { success: true, data: { id: created.id } };
  } catch (e) {
    if (isDuplicateWarehouseCodeError(e)) {
      return { success: false, error: 'Mã kho đã tồn tại' };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tạo kho',
    };
  }
}

export async function updateWarehouseAction(
  id: string,
  input: WarehouseFormInput,
): Promise<WarehouseActionResult> {
  try {
    const session = await requireWarehouseAdmin('inventory.warehouses.update');

    const parsed = warehouseFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu kho không hợp lệ',
      };
    }

    const existing = await db.query.warehouses.findFirst({
      where: eq(warehouses.id, id),
    });
    if (!existing) return { success: false, error: 'Không tìm thấy kho' };

    const d = parsed.data;
    const code = normalizeCode(d.code);
    if (await queryWarehouseByCode(code, id)) {
      return { success: false, error: 'Mã kho đã tồn tại' };
    }

    await db
      .update(warehouses)
      .set({
        code,
        name: d.name,
        address: normalizeOptional(d.address),
        note: normalizeOptional(d.note),
        isActive: d.isActive,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(warehouses.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'inventory.warehouse.update',
      resource: 'warehouse',
      resourceId: id,
      summary: `Cập nhật kho ${code} - ${d.name}`,
      before: {
        code: existing.code,
        name: existing.name,
        isActive: existing.isActive,
      },
      after: {
        code,
        name: d.name,
        isActive: d.isActive,
      },
    });

    revalidateInventory();
    return { success: true, data: undefined };
  } catch (e) {
    if (isDuplicateWarehouseCodeError(e)) {
      return { success: false, error: 'Mã kho đã tồn tại' };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể cập nhật kho',
    };
  }
}

export async function adjustInventoryStockAction(
  input: InventoryStockAdjustmentInput,
): Promise<WarehouseActionResult> {
  try {
    const session = await requireWarehouseAdmin('inventory.stocks.adjust');

    const parsed = inventoryStockAdjustmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu tồn kho không hợp lệ',
      };
    }

    const d = parsed.data;
    const quantityOnHand = String(d.quantityOnHand);
    const [warehouse, item, existingStock] = await Promise.all([
      db.query.warehouses.findFirst({
        where: eq(warehouses.id, d.warehouseId),
      }),
      db.query.inventoryItems.findFirst({
        where: eq(inventoryItems.id, d.itemId),
      }),
      db.query.inventoryStocks.findFirst({
        where: and(
          eq(inventoryStocks.warehouseId, d.warehouseId),
          eq(inventoryStocks.itemId, d.itemId),
        ),
      }),
    ]);

    if (!warehouse) return { success: false, error: 'Không tìm thấy kho' };
    if (!warehouse.isActive) return { success: false, error: 'Kho đang ngừng sử dụng' };
    if (!item) return { success: false, error: 'Không tìm thấy vật tư' };
    if (!item.isActive) return { success: false, error: 'Vật tư đang ngừng sử dụng' };

    if (existingStock && Number(quantityOnHand) < Number(existingStock.quantityReserved)) {
      return {
        success: false,
        error: 'Số tồn thực tế không được nhỏ hơn số lượng đã giữ',
      };
    }

    await db
      .insert(inventoryStocks)
      .values({
        warehouseId: d.warehouseId,
        itemId: d.itemId,
        quantityOnHand,
        updatedBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: [inventoryStocks.warehouseId, inventoryStocks.itemId],
        set: {
          quantityOnHand,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        },
      });

    await createAuditLog({
      userId: session.user.id,
      action: 'inventory.stock.adjust',
      resource: 'inventory_stock',
      resourceId: existingStock?.id ?? null,
      summary: `Điều chỉnh tồn ${item.sku} tại ${warehouse.code}: ${quantityOnHand} ${item.unit}`,
      before: existingStock
        ? {
            quantityOnHand: existingStock.quantityOnHand,
            quantityReserved: existingStock.quantityReserved,
          }
        : null,
      after: {
        warehouseId: d.warehouseId,
        warehouseCode: warehouse.code,
        itemId: d.itemId,
        itemSku: item.sku,
        quantityOnHand,
        note: normalizeOptional(d.note),
      },
    });

    revalidateInventory();
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể điều chỉnh tồn kho',
    };
  }
}
