import { serializeInventoryItems } from './inventory-item-serialize';
import { queryInventoryItems } from './inventory-item.queries';
import type { InventoryItemFilters } from '../schema/inventory-item.schema';

export type LoadInventoryItemsResult =
  | { success: true; data: ReturnType<typeof serializeInventoryItems> }
  | { success: false; error: string };

export async function loadInventoryItemsList(
  filters: InventoryItemFilters = {},
): Promise<LoadInventoryItemsResult> {
  try {
    const rows = await queryInventoryItems(filters);
    return { success: true, data: serializeInventoryItems(rows) };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[inventory] loadInventoryItemsList failed', e);
    }
    return {
      success: false,
      error: 'Không thể tải danh mục vật tư. Vui lòng thử lại.',
    };
  }
}
