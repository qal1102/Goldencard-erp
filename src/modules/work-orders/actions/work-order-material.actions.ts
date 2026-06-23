'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { inventoryItems, workOrderMaterials } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { queryWorkOrderById } from '../lib/work-order.queries';
import {
  queryActiveInventoryItemOptions,
  queryWorkOrderMaterialByWorkOrderAndItem,
  queryWorkOrderMaterials,
} from '../lib/work-order-material.queries';
import {
  type UpdateWorkOrderMaterialInput,
  type WorkOrderMaterialFormInput,
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
  'sales',
  'chief_accountant',
  'technician',
] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
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

async function requireEditableWorkOrder(workOrderId: string) {
  const workOrder = await queryWorkOrderById(workOrderId);
  if (!workOrder) throw new Error('Không tìm thấy lệnh thi công');
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

    const workOrder = await requireEditableWorkOrder(workOrderId);
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

    const workOrder = await requireEditableWorkOrder(workOrderId);
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

export async function cancelWorkOrderMaterialAction(
  workOrderId: string,
  materialId: string,
): Promise<WorkOrderMaterialActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...WORK_ORDER_MATERIAL_WRITE_ROLES);

    const workOrder = await requireEditableWorkOrder(workOrderId);
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
