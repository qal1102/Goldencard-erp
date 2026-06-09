'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { inventoryItems } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireSuperAdminAction } from '@/lib/auth/super-admin';
import {
  inventoryItemFiltersSchema,
  inventoryItemFormSchema,
  type InventoryItemFilters,
  type InventoryItemFormInput,
} from '../schema/inventory-item.schema';
import { serializeInventoryItems } from '../lib/inventory-item-serialize';
import { queryInventoryItemBySku, queryInventoryItems } from '../lib/inventory-item.queries';

export type InventoryActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireInventoryAdmin(action: string) {
  const session = await auth();
  await requireSuperAdminAction(session, action);
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateInventory() {
  revalidatePath('/inventory');
}

function isDuplicateSkuError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const dbError = error as {
    code?: string;
    constraint_name?: string;
    constraint?: string;
  };

  return (
    dbError.code === '23505' &&
    (dbError.constraint_name === 'inventory_items_sku_unique' ||
      dbError.constraint === 'inventory_items_sku_unique')
  );
}

export async function getInventoryItemsAction(
  filters: InventoryItemFilters = {},
): Promise<InventoryActionResult<ReturnType<typeof serializeInventoryItems>>> {
  try {
    await requireInventoryAdmin('inventory.items.list');

    const parsed = inventoryItemFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: 'Bộ lọc không hợp lệ' };
    }

    const rows = await queryInventoryItems(parsed.data);
    return { success: true, data: serializeInventoryItems(rows) };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error && e.message === 'Unauthorized'
          ? 'Bạn không có quyền quản lý danh mục vật tư.'
          : 'Không thể tải danh mục vật tư. Vui lòng thử lại.',
    };
  }
}

export async function createInventoryItemAction(
  input: InventoryItemFormInput,
): Promise<InventoryActionResult<{ id: string }>> {
  try {
    const session = await requireInventoryAdmin('inventory.items.create');

    const parsed = inventoryItemFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu vật tư không hợp lệ',
      };
    }

    const d = parsed.data;
    const sku = d.sku.toUpperCase();
    if (await queryInventoryItemBySku(sku)) {
      return { success: false, error: 'Mã vật tư đã tồn tại' };
    }

    const [created] = await db
      .insert(inventoryItems)
      .values({
        sku,
        name: d.name,
        category: normalizeOptional(d.category),
        unit: d.unit,
        minStock: String(d.minStock),
        isSerializable: d.isSerializable,
        isActive: d.isActive,
        note: normalizeOptional(d.note),
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: inventoryItems.id });

    await createAuditLog({
      userId: session.user.id,
      action: 'inventory.item.create',
      resource: 'inventory_item',
      resourceId: created.id,
      summary: `Tạo vật tư ${sku} - ${d.name}`,
      after: { sku, name: d.name, unit: d.unit, category: d.category ?? null },
    });

    revalidateInventory();
    return { success: true, data: { id: created.id } };
  } catch (e) {
    if (isDuplicateSkuError(e)) {
      return { success: false, error: 'Mã vật tư đã tồn tại' };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tạo vật tư',
    };
  }
}

export async function updateInventoryItemAction(
  id: string,
  input: InventoryItemFormInput,
): Promise<InventoryActionResult> {
  try {
    const session = await requireInventoryAdmin('inventory.items.update');

    const parsed = inventoryItemFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu vật tư không hợp lệ',
      };
    }

    const existing = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, id),
    });
    if (!existing) return { success: false, error: 'Không tìm thấy vật tư' };

    const d = parsed.data;
    const sku = d.sku.toUpperCase();
    if (await queryInventoryItemBySku(sku, id)) {
      return { success: false, error: 'Mã vật tư đã tồn tại' };
    }

    await db
      .update(inventoryItems)
      .set({
        sku,
        name: d.name,
        category: normalizeOptional(d.category),
        unit: d.unit,
        minStock: String(d.minStock),
        isSerializable: d.isSerializable,
        isActive: d.isActive,
        note: normalizeOptional(d.note),
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'inventory.item.update',
      resource: 'inventory_item',
      resourceId: id,
      summary: `Cập nhật vật tư ${sku} - ${d.name}`,
      before: {
        sku: existing.sku,
        name: existing.name,
        unit: existing.unit,
        category: existing.category,
        isActive: existing.isActive,
      },
      after: {
        sku,
        name: d.name,
        unit: d.unit,
        category: d.category ?? null,
        isActive: d.isActive,
      },
    });

    revalidateInventory();
    return { success: true, data: undefined };
  } catch (e) {
    if (isDuplicateSkuError(e)) {
      return { success: false, error: 'Mã vật tư đã tồn tại' };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể cập nhật vật tư',
    };
  }
}
