'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { inventoryItems, quotationPriceCatalog } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { requireRole } from '@/lib/auth/roles';
import {
  queryQuotationPriceCatalog,
  type QuotationPriceCatalogRow,
} from '../lib/quotation-price-catalog.queries';
import {
  quotationPriceCatalogFiltersSchema,
  quotationPriceCatalogFormSchema,
  type QuotationPriceCatalogFilters,
  type QuotationPriceCatalogFormInput,
} from '../schema/quotation-price-catalog.schema';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const QUOTATION_PRICE_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'project_manager',
  'chief_engineer',
  'chief_accountant',
  'accountant',
] as const;

const QUOTATION_PRICE_MANAGE_ROLES = [
  'admin',
  'director',
  'chief_accountant',
  'accountant',
] as const;

async function requireQuotationPriceViewer() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  requireRole(session.user.roles ?? [], ...QUOTATION_PRICE_VIEW_ROLES);
  return session;
}

async function requireQuotationPriceManager() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  requireRole(session.user.roles ?? [], ...QUOTATION_PRICE_MANAGE_ROLES);
  return session;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isDuplicateInventoryItemError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const dbError = error as { code?: string; constraint_name?: string; constraint?: string };
  return (
    dbError.code === '23505' &&
    (dbError.constraint_name === 'quotation_price_catalog_inventory_item_uidx' ||
      dbError.constraint === 'quotation_price_catalog_inventory_item_uidx')
  );
}

async function validateInventoryItemLink(inventoryItemId: string | null) {
  if (!inventoryItemId) return null;

  const item = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.id, inventoryItemId),
    columns: { id: true, sku: true, name: true },
  });

  return item ?? false;
}

async function findPriceByInventoryItem(inventoryItemId: string, excludeId?: string) {
  const rows = await db
    .select({ id: quotationPriceCatalog.id })
    .from(quotationPriceCatalog)
    .where(
      and(
        eq(quotationPriceCatalog.inventoryItemId, inventoryItemId),
        excludeId ? ne(quotationPriceCatalog.id, excludeId) : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

function revalidatePricing() {
  revalidatePath('/quotations');
  revalidatePath('/quotations/new');
}

export async function getQuotationPriceCatalogAction(
  filters: QuotationPriceCatalogFilters = {},
): Promise<ActionResult<QuotationPriceCatalogRow[]>> {
  try {
    await requireQuotationPriceViewer();
    const parsed = quotationPriceCatalogFiltersSchema.safeParse(filters);
    if (!parsed.success) return { success: false, error: 'Bộ lọc bảng giá không hợp lệ' };

    return { success: true, data: await queryQuotationPriceCatalog(parsed.data) };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error && e.message === 'Unauthorized'
          ? 'Bạn cần đăng nhập để xem bảng giá bán.'
          : 'Không thể tải bảng giá bán. Vui lòng thử lại.',
    };
  }
}

export async function createQuotationPriceCatalogAction(
  input: QuotationPriceCatalogFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireQuotationPriceManager();
    const parsed = quotationPriceCatalogFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu bảng giá không hợp lệ',
      };
    }

    const d = parsed.data;
    const linkedItem = await validateInventoryItemLink(d.inventoryItemId);
    if (linkedItem === false) {
      return { success: false, error: 'Vật tư kho không tồn tại hoặc đã bị xóa' };
    }

    if (d.inventoryItemId && (await findPriceByInventoryItem(d.inventoryItemId))) {
      return {
        success: false,
        error: 'Vật tư này đã có trong bảng giá bán. Hãy sửa dòng giá hiện có.',
      };
    }

    const [created] = await db
      .insert(quotationPriceCatalog)
      .values({
        inventoryItemId: d.inventoryItemId,
        displayName: d.displayName,
        description: normalizeOptional(d.description),
        category: normalizeOptional(d.category),
        unit: d.unit,
        unitPrice: d.unitPrice.toFixed(2),
        isMainEquipment: d.isMainEquipment,
        isActive: d.isActive,
        note: normalizeOptional(d.note),
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: quotationPriceCatalog.id });

    await createAuditLog({
      userId: session.user.id,
      action: 'quotation.price.create',
      resource: 'quotation_price_catalog',
      resourceId: created.id,
      summary: `Thêm bảng giá bán: ${d.displayName}`,
      after: {
        displayName: d.displayName,
        unit: d.unit,
        unitPrice: d.unitPrice,
        category: d.category ?? null,
        inventorySku: linkedItem ? linkedItem.sku : null,
        isActive: d.isActive,
      },
    });

    revalidatePricing();
    return { success: true, data: { id: created.id } };
  } catch (e) {
    if (isDuplicateInventoryItemError(e)) {
      return {
        success: false,
        error: 'Vật tư này đã có trong bảng giá bán. Hãy sửa dòng giá hiện có.',
      };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể tạo dòng bảng giá bán',
    };
  }
}

export async function updateQuotationPriceCatalogAction(
  id: string,
  input: QuotationPriceCatalogFormInput,
): Promise<ActionResult> {
  try {
    const session = await requireQuotationPriceManager();
    const parsed = quotationPriceCatalogFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu bảng giá không hợp lệ',
      };
    }

    const existing = await db.query.quotationPriceCatalog.findFirst({
      where: eq(quotationPriceCatalog.id, id),
    });
    if (!existing) return { success: false, error: 'Không tìm thấy dòng bảng giá bán' };

    const d = parsed.data;
    const linkedItem = await validateInventoryItemLink(d.inventoryItemId);
    if (linkedItem === false) {
      return { success: false, error: 'Vật tư kho không tồn tại hoặc đã bị xóa' };
    }

    if (d.inventoryItemId && (await findPriceByInventoryItem(d.inventoryItemId, id))) {
      return {
        success: false,
        error: 'Vật tư này đã có trong bảng giá bán. Hãy sửa dòng giá hiện có.',
      };
    }

    await db
      .update(quotationPriceCatalog)
      .set({
        inventoryItemId: d.inventoryItemId,
        displayName: d.displayName,
        description: normalizeOptional(d.description),
        category: normalizeOptional(d.category),
        unit: d.unit,
        unitPrice: d.unitPrice.toFixed(2),
        isMainEquipment: d.isMainEquipment,
        isActive: d.isActive,
        note: normalizeOptional(d.note),
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(quotationPriceCatalog.id, id));

    await createAuditLog({
      userId: session.user.id,
      action: 'quotation.price.update',
      resource: 'quotation_price_catalog',
      resourceId: id,
      summary: `Cập nhật bảng giá bán: ${d.displayName}`,
      before: {
        displayName: existing.displayName,
        unit: existing.unit,
        unitPrice: existing.unitPrice,
        category: existing.category,
        inventoryItemId: existing.inventoryItemId,
        isActive: existing.isActive,
      },
      after: {
        displayName: d.displayName,
        unit: d.unit,
        unitPrice: d.unitPrice,
        category: d.category ?? null,
        inventorySku: linkedItem ? linkedItem.sku : null,
        isActive: d.isActive,
      },
    });

    revalidatePricing();
    return { success: true, data: undefined };
  } catch (e) {
    if (isDuplicateInventoryItemError(e)) {
      return {
        success: false,
        error: 'Vật tư này đã có trong bảng giá bán. Hãy sửa dòng giá hiện có.',
      };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : 'Không thể cập nhật dòng bảng giá bán',
    };
  }
}
