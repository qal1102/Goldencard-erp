'use server';

import { eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { inventoryItems } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireRole } from '@/lib/auth/roles';
import {
  inventoryItemFiltersSchema,
  inventoryItemFormSchema,
  type InventoryItemFilters,
  type InventoryItemFormInput,
} from '../schema/inventory-item.schema';
import { getInventorySkuPrefix } from '../lib/inventory-item-config';
import { serializeInventoryItems } from '../lib/inventory-item-serialize';
import { queryInventoryItemBySku, queryInventoryItems } from '../lib/inventory-item.queries';

export type InventoryActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireInventoryViewer() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

async function requireInventoryManager() {
  const session = await requireInventoryViewer();
  requireRole(
    session.user.roles ?? [],
    'admin',
    'director',
    'chief_accountant',
    'accountant',
    'technician',
  );
  return session;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function generateInventorySku(category?: string | null, name?: string | null) {
  const prefix = getInventorySkuPrefix(category, name);
  const rows = await db
    .select({ sku: inventoryItems.sku })
    .from(inventoryItems)
    .where(sql`${inventoryItems.sku} like ${`${prefix}-%`}`);

  const maxNumber = rows.reduce((max, row) => {
    const match = row.sku.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
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
    await requireInventoryViewer();

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
          ? 'Bạn cần đăng nhập để xem danh mục vật tư.'
          : 'Không thể tải danh mục vật tư. Vui lòng thử lại.',
    };
  }
}

export async function getInventoryExistingSkusAction(
  skus: string[],
): Promise<InventoryActionResult<string[]>> {
  try {
    await requireInventoryViewer();

    const normalizedSkus = Array.from(
      new Set(skus.map((sku) => sku.trim().toUpperCase()).filter(Boolean)),
    );
    if (normalizedSkus.length === 0) return { success: true, data: [] };

    if (normalizedSkus.length > 500) {
      return { success: false, error: 'Mỗi lần preview tối đa 500 mã vật tư' };
    }

    const rows = await db
      .select({ sku: inventoryItems.sku })
      .from(inventoryItems)
      .where(inArray(inventoryItems.sku, normalizedSkus));

    return { success: true, data: rows.map((row) => row.sku) };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error && e.message === 'Unauthorized'
          ? 'Bạn không có quyền preview danh mục vật tư.'
          : 'Không thể kiểm tra mã vật tư đã tồn tại. Vui lòng thử lại.',
    };
  }
}

export async function createInventoryItemAction(
  input: InventoryItemFormInput,
): Promise<InventoryActionResult<{ id: string }>> {
  try {
    const session = await requireInventoryManager();

    const parsed = inventoryItemFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu vật tư không hợp lệ',
      };
    }

    const d = parsed.data;
    const sku = d.sku.trim()
      ? d.sku.toUpperCase()
      : await generateInventorySku(d.category, d.name);
    if (await queryInventoryItemBySku(sku)) {
      return { success: false, error: 'Mã vật tư đã tồn tại' };
    }

    const [created] = await db
      .insert(inventoryItems)
      .values({
        sku,
        name: d.name,
        category: normalizeOptional(d.category),
        specification: normalizeOptional(d.specification),
        imageUrl: normalizeOptional(d.imageUrl),
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
      summary: `Thêm mã vật tư ${sku} - ${d.name}`,
      after: {
        sku,
        name: d.name,
        unit: d.unit,
        category: d.category ?? null,
        specification: d.specification ?? null,
        imageUrl: d.imageUrl ?? null,
      },
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
    const session = await requireInventoryManager();

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
    const sku = d.sku.trim() ? d.sku.toUpperCase() : existing.sku;
    if (await queryInventoryItemBySku(sku, id)) {
      return { success: false, error: 'Mã vật tư đã tồn tại' };
    }

    await db
      .update(inventoryItems)
      .set({
        sku,
        name: d.name,
        category: normalizeOptional(d.category),
        specification: normalizeOptional(d.specification),
        imageUrl: normalizeOptional(d.imageUrl),
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
        specification: existing.specification,
        imageUrl: existing.imageUrl,
        isActive: existing.isActive,
      },
      after: {
        sku,
        name: d.name,
        unit: d.unit,
        category: d.category ?? null,
        specification: d.specification ?? null,
        imageUrl: d.imageUrl ?? null,
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

export async function importInventoryItemsAction(
  input: InventoryItemFormInput[],
): Promise<InventoryActionResult<{ created: number; updated: number }>> {
  try {
    const session = await requireInventoryManager();

    if (!Array.isArray(input) || input.length === 0) {
      return { success: false, error: 'Không có dòng vật tư hợp lệ để import' };
    }

    if (input.length > 500) {
      return { success: false, error: 'Mỗi lần import tối đa 500 dòng vật tư' };
    }

    const parsedRows: InventoryItemFormInput[] = [];
    const seenSkus = new Set<string>();
    for (const row of input) {
      const parsed = inventoryItemFormSchema.safeParse(row);
      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Dữ liệu import không hợp lệ',
        };
      }

      const normalized = {
        ...parsed.data,
        sku: parsed.data.sku.trim().toUpperCase(),
      };

      if (normalized.sku && seenSkus.has(normalized.sku)) {
        return {
          success: false,
          error: `Mã vật tư bị trùng trong file: ${normalized.sku}`,
        };
      }

      if (normalized.sku) seenSkus.add(normalized.sku);
      parsedRows.push(normalized);
    }

    const lookupSkus = parsedRows.map((row) => row.sku).filter(Boolean);
    const existingRows = await db
      .select({ id: inventoryItems.id, sku: inventoryItems.sku })
      .from(inventoryItems)
      .where(inArray(inventoryItems.sku, lookupSkus.length > 0 ? lookupSkus : ['__NO_SKU__']));
    const existingBySku = new Map(existingRows.map((row) => [row.sku, row.id]));

    let created = 0;
    let updated = 0;
    const finalSkus: string[] = [];

    for (const row of parsedRows) {
      const sku = row.sku || await generateInventorySku(row.category, row.name);
      finalSkus.push(sku);
      const values = {
        sku,
        name: row.name,
        category: normalizeOptional(row.category),
        specification: normalizeOptional(row.specification),
        imageUrl: normalizeOptional(row.imageUrl),
        unit: row.unit,
        minStock: String(row.minStock),
        isSerializable: row.isSerializable,
        isActive: row.isActive,
        note: normalizeOptional(row.note),
        updatedBy: session.user.id,
        updatedAt: new Date(),
      };

      const existingId = row.sku ? existingBySku.get(row.sku) : undefined;
      if (existingId) {
        await db.update(inventoryItems).set(values).where(eq(inventoryItems.id, existingId));
        updated += 1;
      } else {
        await db.insert(inventoryItems).values({
          ...values,
          createdBy: session.user.id,
        });
        created += 1;
      }
    }

    const skuSample = finalSkus.slice(0, 20);

    await createAuditLog({
      userId: session.user.id,
      action: 'inventory.item.import',
      resource: 'inventory_item',
      summary: `Import danh mục vật tư: tạo mới ${created}, cập nhật ${updated}`,
      after: {
        created,
        updated,
        total: parsedRows.length,
        skuSample,
        hiddenSkuCount: Math.max(parsedRows.length - skuSample.length, 0),
      },
    });

    revalidateInventory();
    return { success: true, data: { created, updated } };
  } catch (e) {
    if (isDuplicateSkuError(e)) {
      return { success: false, error: 'Mã vật tư đã tồn tại' };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể import danh mục vật tư',
    };
  }
}
