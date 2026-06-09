import type { InventoryItemListRow } from './inventory-item.queries';

export type SerializedInventoryItem = Omit<
  InventoryItemListRow,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

export function serializeInventoryItems(
  rows: InventoryItemListRow[],
): SerializedInventoryItem[] {
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}
