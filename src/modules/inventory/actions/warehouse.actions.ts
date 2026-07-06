'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  inventoryItems,
  inventoryStockMovements,
  inventoryStocks,
  workOrders,
  warehouses,
} from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireRole } from '@/lib/auth/roles';
import { INVENTORY_MANAGER_ROLES } from '../lib/inventory-permissions';
import { serializeWarehouses } from '../lib/warehouse-serialize';
import {
  queryInventoryStockMovementRows,
  queryInventoryStockRows,
  queryWarehouseByCode,
  queryWarehouses,
} from '../lib/warehouse.queries';
import {
  type InventoryStockAdjustmentInput,
  type InventoryStockMovementInput,
  type InventoryStockTransferInput,
  type WarehouseFilters,
  type WarehouseFormInput,
  inventoryStockAdjustmentSchema,
  inventoryStockMovementSchema,
  inventoryStockTransferSchema,
  warehouseFiltersSchema,
  warehouseFormSchema,
} from '../schema/warehouse.schema';

export type WarehouseActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireWarehouseViewer() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

async function requireWarehouseManager() {
  const session = await requireWarehouseViewer();
  requireRole(session.user.roles ?? [], ...INVENTORY_MANAGER_ROLES);
  return session;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

async function generateWarehouseCode() {
  const rows = await db
    .select({ code: warehouses.code })
    .from(warehouses)
    .where(sql`${warehouses.code} like 'KHO-%'`);

  const maxNumber = rows.reduce((max, row) => {
    const match = row.code.match(/^KHO-(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  return `KHO-${String(maxNumber + 1).padStart(4, '0')}`;
}

function getMovementLabel(type: InventoryStockMovementInput['type']) {
  if (type === 'in') return 'Nhập kho';
  if (type === 'return') return 'Trả kho';
  return 'Xuất kho';
}

function getMovementDocumentPrefix(type: InventoryStockMovementInput['type'] | 'transfer') {
  if (type === 'in') return 'NK';
  if (type === 'out') return 'XK';
  if (type === 'return') return 'TK';
  return 'CK';
}

async function generateMovementDocumentCode(type: InventoryStockMovementInput['type'] | 'transfer') {
  const prefix = getMovementDocumentPrefix(type);
  const rows = await db
    .select({ documentCode: inventoryStockMovements.documentCode })
    .from(inventoryStockMovements)
    .where(sql`${inventoryStockMovements.documentCode} like ${`${prefix}-%`}`);

  const maxNumber = rows.reduce((max, row) => {
    const match = row.documentCode?.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
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

function serializeInventoryStockMovementRows(
  rows: Awaited<ReturnType<typeof queryInventoryStockMovementRows>>,
) {
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
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
    await requireWarehouseViewer();

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
          ? 'Bạn cần đăng nhập để xem danh sách kho.'
          : 'Không thể tải danh sách kho. Vui lòng thử lại.',
    };
  }
}

export async function getInventoryStocksAction(): Promise<
  WarehouseActionResult<ReturnType<typeof serializeInventoryStockRows>>
> {
  try {
    await requireWarehouseViewer();
    const rows = await queryInventoryStockRows();
    return { success: true, data: serializeInventoryStockRows(rows) };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error && e.message === 'Unauthorized'
          ? 'Bạn cần đăng nhập để xem tồn kho.'
          : 'Không thể tải tồn kho. Vui lòng thử lại.',
    };
  }
}

export async function getInventoryStockMovementsAction(): Promise<
  WarehouseActionResult<ReturnType<typeof serializeInventoryStockMovementRows>>
> {
  try {
    await requireWarehouseViewer();
    const rows = await queryInventoryStockMovementRows();
    return { success: true, data: serializeInventoryStockMovementRows(rows) };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error && e.message === 'Unauthorized'
          ? 'Bạn cần đăng nhập để xem lịch sử kho.'
          : 'Không thể tải lịch sử kho. Vui lòng thử lại.',
    };
  }
}

export async function createWarehouseAction(
  input: WarehouseFormInput,
): Promise<WarehouseActionResult<{ id: string }>> {
  try {
    const session = await requireWarehouseManager();

    const parsed = warehouseFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu kho không hợp lệ',
      };
    }

    const d = parsed.data;
    const code = d.code.trim() ? normalizeCode(d.code) : await generateWarehouseCode();
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
    const session = await requireWarehouseManager();

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
    const code = d.code.trim() ? normalizeCode(d.code) : existing.code;
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
    const session = await requireWarehouseManager();

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

export async function createInventoryStockMovementAction(
  input: InventoryStockMovementInput,
): Promise<WarehouseActionResult> {
  try {
    const session = await requireWarehouseManager();

    const parsed = inventoryStockMovementSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu phiếu kho không hợp lệ',
      };
    }

    const d = parsed.data;
    const documentCode = await generateMovementDocumentCode(d.type);
    const result = await db.transaction(async (tx) => {
      const [warehouse, item, workOrder] = await Promise.all([
        tx.query.warehouses.findFirst({
          where: eq(warehouses.id, d.warehouseId),
        }),
        tx.query.inventoryItems.findFirst({
          where: eq(inventoryItems.id, d.itemId),
        }),
        d.workOrderId
          ? tx.query.workOrders.findFirst({
              where: eq(workOrders.id, d.workOrderId),
            })
          : Promise.resolve(null),
      ]);

      if (!warehouse) throw new Error('Không tìm thấy kho');
      if (!warehouse.isActive) throw new Error('Kho đang ngừng sử dụng');
      if (!item) throw new Error('Không tìm thấy vật tư');
      if (!item.isActive) throw new Error('Vật tư đang ngừng sử dụng');
      if (d.workOrderId && !workOrder) throw new Error('Không tìm thấy lệnh thi công');

      const quantity = d.quantity;
      await tx
        .insert(inventoryStocks)
        .values({
          warehouseId: d.warehouseId,
          itemId: d.itemId,
          quantityOnHand: '0',
          updatedBy: session.user.id,
        })
        .onConflictDoNothing({
          target: [inventoryStocks.warehouseId, inventoryStocks.itemId],
        });

      const lockedRows = await tx.execute<{
        quantity_on_hand: string;
        quantity_reserved: string;
      }>(sql`
        select quantity_on_hand, quantity_reserved
        from inventory_stocks
        where warehouse_id = ${d.warehouseId}
          and item_id = ${d.itemId}
        for update
      `);
      const lockedStock = lockedRows[0];
      if (!lockedStock) throw new Error('Không thể khóa dòng tồn kho');

      const before = Number(lockedStock.quantity_on_hand);
      const reserved = Number(lockedStock.quantity_reserved);
      const after = d.type === 'in' || d.type === 'return' ? before + quantity : before - quantity;
      if (d.type === 'out' && after < reserved) {
        throw new Error('Số lượng xuất vượt tồn khả dụng');
      }

      const [movement] = await tx
        .insert(inventoryStockMovements)
        .values({
          documentCode,
          type: d.type,
          warehouseId: d.warehouseId,
          itemId: d.itemId,
          workOrderId: d.workOrderId ?? null,
          quantity: String(quantity),
          quantityBefore: String(before),
          quantityAfter: String(after),
          note: normalizeOptional(d.note),
          createdBy: session.user.id,
        })
        .returning({ id: inventoryStockMovements.id });

      await tx
        .update(inventoryStocks)
        .set({
          quantityOnHand: String(after),
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryStocks.warehouseId, d.warehouseId),
            eq(inventoryStocks.itemId, d.itemId),
          ),
        );

      return {
        movementId: movement.id,
        documentCode,
        warehouse,
        item,
        workOrder,
        before,
        after,
        quantity,
      };
    });

    await createAuditLog({
      userId: session.user.id,
      action: `inventory.stock.${input.type}`,
      resource: 'inventory_stock_movement',
      resourceId: result.movementId,
      summary: `${result.documentCode} - ${getMovementLabel(input.type)} ${result.item.sku} tại ${result.warehouse.code}: ${result.quantity} ${result.item.unit}`,
      before: {
        quantityOnHand: result.before,
      },
      after: {
        warehouseId: input.warehouseId,
        warehouseCode: result.warehouse.code,
        itemId: input.itemId,
        itemSku: result.item.sku,
        workOrderId: input.workOrderId ?? null,
        workOrderCode: result.workOrder?.code ?? null,
        movementType: input.type,
        documentCode: result.documentCode,
        quantity: result.quantity,
        quantityOnHand: result.after,
        note: normalizeOptional(input.note),
      },
    });

    revalidateInventory();
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tạo phiếu kho',
    };
  }
}

export async function createInventoryStockTransferAction(
  input: InventoryStockTransferInput,
): Promise<WarehouseActionResult> {
  try {
    const session = await requireWarehouseManager();

    const parsed = inventoryStockTransferSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu chuyển kho không hợp lệ',
      };
    }

    const d = parsed.data;
    const documentCode = await generateMovementDocumentCode('transfer');
    const result = await db.transaction(async (tx) => {
      const [fromWarehouse, toWarehouse, item] = await Promise.all([
        tx.query.warehouses.findFirst({ where: eq(warehouses.id, d.fromWarehouseId) }),
        tx.query.warehouses.findFirst({ where: eq(warehouses.id, d.toWarehouseId) }),
        tx.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, d.itemId) }),
      ]);

      if (!fromWarehouse) throw new Error('Không tìm thấy kho xuất');
      if (!toWarehouse) throw new Error('Không tìm thấy kho nhận');
      if (!fromWarehouse.isActive) throw new Error('Kho xuất đang ngừng sử dụng');
      if (!toWarehouse.isActive) throw new Error('Kho nhận đang ngừng sử dụng');
      if (!item) throw new Error('Không tìm thấy vật tư');
      if (!item.isActive) throw new Error('Vật tư đang ngừng sử dụng');

      await tx
        .insert(inventoryStocks)
        .values([
          {
            warehouseId: d.fromWarehouseId,
            itemId: d.itemId,
            quantityOnHand: '0',
            updatedBy: session.user.id,
          },
          {
            warehouseId: d.toWarehouseId,
            itemId: d.itemId,
            quantityOnHand: '0',
            updatedBy: session.user.id,
          },
        ])
        .onConflictDoNothing({
          target: [inventoryStocks.warehouseId, inventoryStocks.itemId],
        });

      const lockedRows = await tx.execute<{
        warehouse_id: string;
        quantity_on_hand: string;
        quantity_reserved: string;
      }>(sql`
        select warehouse_id, quantity_on_hand, quantity_reserved
        from inventory_stocks
        where item_id = ${d.itemId}
          and warehouse_id in (${d.fromWarehouseId}, ${d.toWarehouseId})
        order by warehouse_id
        for update
      `);

      const fromStock = lockedRows.find((row) => row.warehouse_id === d.fromWarehouseId);
      const toStock = lockedRows.find((row) => row.warehouse_id === d.toWarehouseId);
      if (!fromStock || !toStock) throw new Error('Không thể khóa dòng tồn kho');

      const quantity = d.quantity;
      const fromBefore = Number(fromStock.quantity_on_hand);
      const fromReserved = Number(fromStock.quantity_reserved);
      const toBefore = Number(toStock.quantity_on_hand);
      const fromAfter = fromBefore - quantity;
      const toAfter = toBefore + quantity;

      if (fromAfter < fromReserved) {
        throw new Error('Số lượng chuyển vượt tồn khả dụng của kho xuất');
      }

      const note = normalizeOptional(d.note);
      const [outMovement, inMovement] = await tx
        .insert(inventoryStockMovements)
        .values([
          {
            documentCode,
            type: 'transfer_out',
            warehouseId: d.fromWarehouseId,
            itemId: d.itemId,
            quantity: String(quantity),
            quantityBefore: String(fromBefore),
            quantityAfter: String(fromAfter),
            note,
            createdBy: session.user.id,
          },
          {
            documentCode,
            type: 'transfer_in',
            warehouseId: d.toWarehouseId,
            itemId: d.itemId,
            quantity: String(quantity),
            quantityBefore: String(toBefore),
            quantityAfter: String(toAfter),
            note,
            createdBy: session.user.id,
          },
        ])
        .returning({ id: inventoryStockMovements.id });

      await Promise.all([
        tx
          .update(inventoryStocks)
          .set({
            quantityOnHand: String(fromAfter),
            updatedBy: session.user.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryStocks.warehouseId, d.fromWarehouseId),
              eq(inventoryStocks.itemId, d.itemId),
            ),
          ),
        tx
          .update(inventoryStocks)
          .set({
            quantityOnHand: String(toAfter),
            updatedBy: session.user.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryStocks.warehouseId, d.toWarehouseId),
              eq(inventoryStocks.itemId, d.itemId),
            ),
          ),
      ]);

      return {
        movementId: `${outMovement.id}:${inMovement.id}`,
        documentCode,
        fromWarehouse,
        toWarehouse,
        item,
        quantity,
        fromBefore,
        fromAfter,
        toBefore,
        toAfter,
      };
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'inventory.stock.transfer',
      resource: 'inventory_stock_movement',
      resourceId: result.movementId,
      summary: `${result.documentCode} - Chuyển kho ${result.item.sku}: ${result.quantity} ${result.item.unit} từ ${result.fromWarehouse.code} sang ${result.toWarehouse.code}`,
      before: {
        fromWarehouseId: input.fromWarehouseId,
        fromWarehouseCode: result.fromWarehouse.code,
        quantityOnHand: result.fromBefore,
      },
      after: {
        toWarehouseId: input.toWarehouseId,
        toWarehouseCode: result.toWarehouse.code,
        itemId: input.itemId,
        itemSku: result.item.sku,
        documentCode: result.documentCode,
        quantity: result.quantity,
        fromQuantityOnHand: result.fromAfter,
        toQuantityOnHand: result.toAfter,
        note: normalizeOptional(input.note),
      },
    });

    revalidateInventory();
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể chuyển kho',
    };
  }
}
