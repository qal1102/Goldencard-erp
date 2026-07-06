'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { inventoryItems, inventoryStocks, warehouses, workOrderMaterials } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { hasRole, requireRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { queryWorkOrderById } from '../lib/work-order.queries';
import {
  queryActiveInventoryItemOptions,
  queryWorkOrderMaterialByWorkOrderAndItem,
  queryWorkOrderMaterials,
} from '../lib/work-order-material.queries';
import {
  type ReserveWorkOrderMaterialInput,
  type UpdateWorkOrderMaterialInput,
  type WorkOrderMaterialFormInput,
  reserveWorkOrderMaterialSchema,
  workOrderMaterialFormSchema,
  updateWorkOrderMaterialSchema,
} from '../schema/work-order-material.schema';

export type WorkOrderMaterialActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const WORK_ORDER_MATERIAL_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
] as const;

const WORK_ORDER_MATERIAL_WRITE_ROLES = [
  'admin',
  'director',
  'chief_accountant',
  'accountant',
  'technician',
] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

type WorkOrderMaterialSession = Awaited<ReturnType<typeof getSessionOrThrow>>;

function isTechnicianOnly(roles: string[]) {
  return (
    hasRole(roles, 'technician') &&
    !hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant', 'accountant')
  );
}

function normalizeNote(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateWorkOrder(workOrderId: string) {
  revalidatePath('/work-orders');
  revalidatePath(`/work-orders/${workOrderId}`);
}

function isDuplicateMaterialError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const dbError = error as { code?: string; constraint_name?: string; constraint?: string };
  return (
    dbError.code === '23505' &&
    (dbError.constraint_name === 'work_order_materials_work_order_item_uidx' ||
      dbError.constraint === 'work_order_materials_work_order_item_uidx')
  );
}

async function requireViewableWorkOrder(workOrderId: string, session: WorkOrderMaterialSession) {
  const workOrder = await queryWorkOrderById(workOrderId);
  if (!workOrder) throw new Error('Không tìm thấy lệnh thi công');
  if (isTechnicianOnly(session.user.roles ?? []) && workOrder.assignedTo !== session.user.id) {
    throw new Error('Không có quyền xem vật tư của lệnh thi công này');
  }
  return workOrder;
}

async function requireEditableWorkOrder(workOrderId: string, session: WorkOrderMaterialSession) {
  const workOrder = await requireViewableWorkOrder(workOrderId, session);
  if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
    throw new Error('Không thể chỉnh vật tư khi lệnh thi công đã hoàn thành hoặc đã hủy');
  }
  return workOrder;
}

export async function getWorkOrderMaterialsAction(
  workOrderId: string,
): Promise<WorkOrderMaterialActionResult<Awaited<ReturnType<typeof queryWorkOrderMaterials>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_VIEW_ROLES);
    await requireViewableWorkOrder(workOrderId, session);
    const data = await queryWorkOrderMaterials(workOrderId);
    return { success: true, data: serializeForClient(data) };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tải vật tư dự trù',
    };
  }
}

export async function getWorkOrderMaterialItemOptionsAction(): Promise<
  WorkOrderMaterialActionResult<Awaited<ReturnType<typeof queryActiveInventoryItemOptions>>>
> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_VIEW_ROLES);
    const data = await queryActiveInventoryItemOptions();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tải danh mục vật tư',
    };
  }
}

export async function createWorkOrderMaterialAction(
  workOrderId: string,
  input: WorkOrderMaterialFormInput,
): Promise<WorkOrderMaterialActionResult<{ id: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_WRITE_ROLES);

    const parsed = workOrderMaterialFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu vật tư không hợp lệ',
      };
    }

    const workOrder = await requireEditableWorkOrder(workOrderId, session);
    const item = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, parsed.data.itemId),
      columns: { id: true, sku: true, name: true, unit: true, isActive: true },
    });
    if (!item || !item.isActive) {
      return { success: false, error: 'Vật tư không tồn tại hoặc đã ngừng sử dụng' };
    }

    const duplicate = await queryWorkOrderMaterialByWorkOrderAndItem(workOrderId, item.id);
    if (duplicate && duplicate.status !== 'cancelled') {
      return { success: false, error: 'Vật tư này đã có trong dự trù' };
    }

    const values = {
      workOrderId,
      itemId: item.id,
      plannedQuantity: String(parsed.data.plannedQuantity),
      reservedQuantity: '0',
      issuedQuantity: '0',
      status: 'planned',
      note: normalizeNote(parsed.data.note),
      createdBy: session.user.id,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    };

    const [row] =
      duplicate?.status === 'cancelled'
        ? await db
            .update(workOrderMaterials)
            .set(values)
            .where(eq(workOrderMaterials.id, duplicate.id))
            .returning({ id: workOrderMaterials.id })
        : await db
            .insert(workOrderMaterials)
            .values(values)
            .returning({ id: workOrderMaterials.id });

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.material.create',
      resource: 'work_order',
      resourceId: workOrderId,
      summary: `Thêm vật tư dự trù ${item.sku} cho ${workOrder.code}`,
      after: {
        itemId: item.id,
        sku: item.sku,
        plannedQuantity: parsed.data.plannedQuantity,
        unit: item.unit,
      },
    });

    revalidateWorkOrder(workOrderId);
    return { success: true, data: { id: row.id } };
  } catch (e) {
    if (isDuplicateMaterialError(e)) {
      return { success: false, error: 'Vật tư này đã có trong dự trù' };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể thêm vật tư dự trù',
    };
  }
}

export async function updateWorkOrderMaterialAction(
  workOrderId: string,
  materialId: string,
  input: UpdateWorkOrderMaterialInput,
): Promise<WorkOrderMaterialActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_WRITE_ROLES);

    const parsed = updateWorkOrderMaterialSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu vật tư không hợp lệ',
      };
    }

    const workOrder = await requireEditableWorkOrder(workOrderId, session);
    const existing = await db.query.workOrderMaterials.findFirst({
      where: eq(workOrderMaterials.id, materialId),
      with: { item: { columns: { sku: true, name: true, unit: true } } },
    });
    if (!existing || existing.workOrderId !== workOrderId) {
      return { success: false, error: 'Không tìm thấy dòng vật tư' };
    }
    if (existing.status === 'cancelled' || existing.status === 'issued') {
      return { success: false, error: 'Không thể sửa dòng vật tư ở trạng thái này' };
    }

    await db
      .update(workOrderMaterials)
      .set({
        plannedQuantity: String(parsed.data.plannedQuantity),
        note: normalizeNote(parsed.data.note),
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(workOrderMaterials.id, materialId));

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.material.update',
      resource: 'work_order',
      resourceId: workOrderId,
      summary: `Cập nhật vật tư dự trù ${existing.item.sku} cho ${workOrder.code}`,
      before: {
        plannedQuantity: existing.plannedQuantity,
        note: existing.note,
      },
      after: {
        plannedQuantity: parsed.data.plannedQuantity,
        note: normalizeNote(parsed.data.note),
      },
    });

    revalidateWorkOrder(workOrderId);
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể cập nhật vật tư dự trù',
    };
  }
}

export async function getWorkOrderMaterialStockOptionsAction(
  itemId: string,
): Promise<
  WorkOrderMaterialActionResult<
    {
      warehouseId: string;
      warehouseCode: string;
      warehouseName: string;
      quantityOnHand: string;
      quantityReserved: string;
      quantityAvailable: string;
    }[]
  >
> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_VIEW_ROLES);

    const item = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, itemId),
      columns: { id: true },
    });
    if (!item) return { success: false, error: 'Không tìm thấy vật tư' };

    const rows = await db
      .select({
        warehouseId: warehouses.id,
        warehouseCode: warehouses.code,
        warehouseName: warehouses.name,
        quantityOnHand: sql<string>`coalesce(${inventoryStocks.quantityOnHand}, 0)`,
        quantityReserved: sql<string>`coalesce(${inventoryStocks.quantityReserved}, 0)`,
        quantityAvailable: sql<string>`coalesce(${inventoryStocks.quantityOnHand}, 0) - coalesce(${inventoryStocks.quantityReserved}, 0)`,
      })
      .from(warehouses)
      .leftJoin(
        inventoryStocks,
        and(
          eq(inventoryStocks.warehouseId, warehouses.id),
          eq(inventoryStocks.itemId, itemId),
        ),
      )
      .where(eq(warehouses.isActive, true));

    return { success: true, data: serializeForClient(rows) };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tải tồn khả dụng',
    };
  }
}

export async function reserveWorkOrderMaterialAction(
  workOrderId: string,
  materialId: string,
  input: ReserveWorkOrderMaterialInput,
): Promise<WorkOrderMaterialActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_WRITE_ROLES);

    const parsed = reserveWorkOrderMaterialSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu giữ vật tư không hợp lệ',
      };
    }

    const workOrder = await requireEditableWorkOrder(workOrderId, session);
    const d = parsed.data;

    const result = await db.transaction(async (tx) => {
      const material = await tx.query.workOrderMaterials.findFirst({
        where: eq(workOrderMaterials.id, materialId),
        with: { item: { columns: { sku: true, name: true, unit: true } } },
      });
      if (!material || material.workOrderId !== workOrderId) {
        throw new Error('Không tìm thấy dòng vật tư');
      }
      if (material.status === 'cancelled' || material.status === 'issued') {
        throw new Error('Không thể giữ vật tư ở trạng thái này');
      }

      const warehouse = await tx.query.warehouses.findFirst({
        where: eq(warehouses.id, d.warehouseId),
      });
      if (!warehouse || !warehouse.isActive) throw new Error('Kho không hợp lệ');

      await tx
        .insert(inventoryStocks)
        .values({
          warehouseId: d.warehouseId,
          itemId: material.itemId,
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
          and item_id = ${material.itemId}
        for update
      `);
      const lockedStock = lockedRows[0];
      if (!lockedStock) throw new Error('Không thể khóa dòng tồn kho');

      const planned = Number(material.plannedQuantity);
      const alreadyReservedForOrder = Number(material.reservedQuantity);
      const issued = Number(material.issuedQuantity);
      const remainingNeed = Math.max(planned - alreadyReservedForOrder - issued, 0);
      if (d.quantity > remainingNeed) {
        throw new Error('Số lượng giữ vượt nhu cầu còn lại của lệnh thi công');
      }

      const onHand = Number(lockedStock.quantity_on_hand);
      const reserved = Number(lockedStock.quantity_reserved);
      const available = onHand - reserved;
      if (d.quantity > available) {
        throw new Error('Số lượng giữ vượt tồn khả dụng của kho');
      }

      const nextStockReserved = reserved + d.quantity;
      const nextMaterialReserved = alreadyReservedForOrder + d.quantity;

      await tx
        .update(inventoryStocks)
        .set({
          quantityReserved: String(nextStockReserved),
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryStocks.warehouseId, d.warehouseId),
            eq(inventoryStocks.itemId, material.itemId),
          ),
        );

      await tx
        .update(workOrderMaterials)
        .set({
          reservedQuantity: String(nextMaterialReserved),
          status: nextMaterialReserved > 0 ? 'approved' : material.status,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(workOrderMaterials.id, materialId));

      return { material, warehouse, nextMaterialReserved };
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.material.reserve',
      resource: 'work_order',
      resourceId: workOrderId,
      summary: `Giữ ${input.quantity} ${result.material.item.unit} ${result.material.item.sku} từ ${result.warehouse.code} cho ${workOrder.code}`,
      after: {
        materialId,
        itemId: result.material.itemId,
        itemSku: result.material.item.sku,
        warehouseId: input.warehouseId,
        warehouseCode: result.warehouse.code,
        reservedQuantity: result.nextMaterialReserved,
        note: normalizeNote(input.note),
      },
    });

    revalidateWorkOrder(workOrderId);
    revalidatePath('/inventory');
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể giữ vật tư',
    };
  }
}

export async function releaseWorkOrderMaterialReservationAction(
  workOrderId: string,
  materialId: string,
  input: ReserveWorkOrderMaterialInput,
): Promise<WorkOrderMaterialActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_WRITE_ROLES);

    const parsed = reserveWorkOrderMaterialSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu hủy giữ vật tư không hợp lệ',
      };
    }

    const workOrder = await requireEditableWorkOrder(workOrderId, session);
    const d = parsed.data;

    const result = await db.transaction(async (tx) => {
      const material = await tx.query.workOrderMaterials.findFirst({
        where: eq(workOrderMaterials.id, materialId),
        with: { item: { columns: { sku: true, name: true, unit: true } } },
      });
      if (!material || material.workOrderId !== workOrderId) {
        throw new Error('Không tìm thấy dòng vật tư');
      }

      const warehouse = await tx.query.warehouses.findFirst({
        where: eq(warehouses.id, d.warehouseId),
      });
      if (!warehouse) throw new Error('Không tìm thấy kho');

      const lockedRows = await tx.execute<{
        quantity_reserved: string;
      }>(sql`
        select quantity_reserved
        from inventory_stocks
        where warehouse_id = ${d.warehouseId}
          and item_id = ${material.itemId}
        for update
      `);
      const lockedStock = lockedRows[0];
      if (!lockedStock) throw new Error('Kho này chưa giữ vật tư này');

      const stockReserved = Number(lockedStock.quantity_reserved);
      const materialReserved = Number(material.reservedQuantity);
      if (d.quantity > stockReserved || d.quantity > materialReserved) {
        throw new Error('Số lượng hủy giữ vượt số lượng đang giữ');
      }

      const nextStockReserved = stockReserved - d.quantity;
      const nextMaterialReserved = materialReserved - d.quantity;

      await tx
        .update(inventoryStocks)
        .set({
          quantityReserved: String(nextStockReserved),
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryStocks.warehouseId, d.warehouseId),
            eq(inventoryStocks.itemId, material.itemId),
          ),
        );

      await tx
        .update(workOrderMaterials)
        .set({
          reservedQuantity: String(nextMaterialReserved),
          status: nextMaterialReserved > 0 ? material.status : 'planned',
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(workOrderMaterials.id, materialId));

      return { material, warehouse, nextMaterialReserved };
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.material.release_reservation',
      resource: 'work_order',
      resourceId: workOrderId,
      summary: `Hủy giữ ${input.quantity} ${result.material.item.unit} ${result.material.item.sku} từ ${result.warehouse.code} cho ${workOrder.code}`,
      after: {
        materialId,
        itemId: result.material.itemId,
        itemSku: result.material.item.sku,
        warehouseId: input.warehouseId,
        warehouseCode: result.warehouse.code,
        reservedQuantity: result.nextMaterialReserved,
        note: normalizeNote(input.note),
      },
    });

    revalidateWorkOrder(workOrderId);
    revalidatePath('/inventory');
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể hủy giữ vật tư',
    };
  }
}

export async function cancelWorkOrderMaterialAction(
  workOrderId: string,
  materialId: string,
): Promise<WorkOrderMaterialActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_WRITE_ROLES);

    const workOrder = await requireEditableWorkOrder(workOrderId, session);
    const existing = await db.query.workOrderMaterials.findFirst({
      where: eq(workOrderMaterials.id, materialId),
      with: { item: { columns: { sku: true, name: true, unit: true } } },
    });
    if (!existing || existing.workOrderId !== workOrderId) {
      return { success: false, error: 'Không tìm thấy dòng vật tư' };
    }
    if (existing.status === 'issued' || Number(existing.issuedQuantity) > 0) {
      return { success: false, error: 'Không thể hủy dòng vật tư đã xuất kho' };
    }

    await db
      .update(workOrderMaterials)
      .set({
        status: 'cancelled',
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(workOrderMaterials.id, materialId));

    await createAuditLog({
      userId: session.user.id,
      action: 'work_order.material.cancel',
      resource: 'work_order',
      resourceId: workOrderId,
      summary: `Hủy vật tư dự trù ${existing.item.sku} khỏi ${workOrder.code}`,
      before: {
        itemId: existing.itemId,
        sku: existing.item.sku,
        plannedQuantity: existing.plannedQuantity,
        status: existing.status,
      },
      after: { status: 'cancelled' },
    });

    revalidateWorkOrder(workOrderId);
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể hủy dòng vật tư',
    };
  }
}
