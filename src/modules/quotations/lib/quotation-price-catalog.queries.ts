import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems, quotationPriceCatalog } from '@/db/schema';
import {
  quotationPriceCatalogFiltersSchema,
  type QuotationPriceCatalogFilters,
} from '../schema/quotation-price-catalog.schema';

export async function queryQuotationPriceCatalog(
  filters: QuotationPriceCatalogFilters = {},
) {
  const parsed = quotationPriceCatalogFiltersSchema.parse(filters);
  const q = parsed.q?.trim();

  const where = and(
    parsed.status === 'active'
      ? eq(quotationPriceCatalog.isActive, true)
      : parsed.status === 'inactive'
        ? eq(quotationPriceCatalog.isActive, false)
        : undefined,
    q
      ? or(
          ilike(quotationPriceCatalog.displayName, `%${q}%`),
          ilike(quotationPriceCatalog.description, `%${q}%`),
          ilike(quotationPriceCatalog.category, `%${q}%`),
          ilike(inventoryItems.sku, `%${q}%`),
          ilike(inventoryItems.name, `%${q}%`),
        )
      : undefined,
  );

  return db
    .select({
      id: quotationPriceCatalog.id,
      inventoryItemId: quotationPriceCatalog.inventoryItemId,
      displayName: quotationPriceCatalog.displayName,
      description: quotationPriceCatalog.description,
      category: quotationPriceCatalog.category,
      unit: quotationPriceCatalog.unit,
      unitPrice: quotationPriceCatalog.unitPrice,
      isMainEquipment: quotationPriceCatalog.isMainEquipment,
      isActive: quotationPriceCatalog.isActive,
      note: quotationPriceCatalog.note,
      inventorySku: inventoryItems.sku,
      inventoryName: inventoryItems.name,
      inventorySpecification: inventoryItems.specification,
      inventoryImageUrl: inventoryItems.imageUrl,
    })
    .from(quotationPriceCatalog)
    .leftJoin(inventoryItems, eq(quotationPriceCatalog.inventoryItemId, inventoryItems.id))
    .where(where)
    .orderBy(
      desc(quotationPriceCatalog.isActive),
      desc(quotationPriceCatalog.isMainEquipment),
      asc(quotationPriceCatalog.category),
      asc(quotationPriceCatalog.displayName),
    )
    .limit(200);
}

export async function queryActiveQuotationPriceOptions() {
  return db
    .select({
      id: quotationPriceCatalog.id,
      inventoryItemId: quotationPriceCatalog.inventoryItemId,
      displayName: quotationPriceCatalog.displayName,
      description: quotationPriceCatalog.description,
      category: quotationPriceCatalog.category,
      unit: quotationPriceCatalog.unit,
      unitPrice: quotationPriceCatalog.unitPrice,
      isMainEquipment: quotationPriceCatalog.isMainEquipment,
      inventorySku: inventoryItems.sku,
      inventoryName: inventoryItems.name,
      inventorySpecification: inventoryItems.specification,
      inventoryImageUrl: inventoryItems.imageUrl,
    })
    .from(quotationPriceCatalog)
    .leftJoin(inventoryItems, eq(quotationPriceCatalog.inventoryItemId, inventoryItems.id))
    .where(eq(quotationPriceCatalog.isActive, true))
    .orderBy(
      desc(quotationPriceCatalog.isMainEquipment),
      asc(quotationPriceCatalog.category),
      asc(quotationPriceCatalog.displayName),
    )
    .limit(200);
}

export type QuotationPriceCatalogRow = Awaited<
  ReturnType<typeof queryQuotationPriceCatalog>
>[number];

export type QuotationPriceOption = Awaited<
  ReturnType<typeof queryActiveQuotationPriceOptions>
>[number];
