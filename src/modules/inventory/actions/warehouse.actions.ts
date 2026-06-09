'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { warehouses } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireSuperAdminAction } from '@/lib/auth/super-admin';
import { serializeWarehouses } from '../lib/warehouse-serialize';
import { queryWarehouseByCode, queryWarehouses } from '../lib/warehouse.queries';
import {
  type WarehouseFilters,
  type WarehouseFormInput,
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
