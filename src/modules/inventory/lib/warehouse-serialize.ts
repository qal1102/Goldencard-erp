import type { warehouses } from '@/db/schema';

type WarehouseRow = typeof warehouses.$inferSelect;

export function serializeWarehouses(rows: WarehouseRow[]) {
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export type SerializedWarehouse = ReturnType<typeof serializeWarehouses>[number];
