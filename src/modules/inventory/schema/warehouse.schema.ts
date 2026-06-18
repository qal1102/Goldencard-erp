import { z } from 'zod';

export const warehouseFiltersSchema = z.object({
  status: z.enum(['all', 'active', 'inactive']).optional(),
});

export const warehouseFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Mã kho là bắt buộc')
    .max(50, 'Mã kho tối đa 50 ký tự'),
  name: z
    .string()
    .trim()
    .min(1, 'Tên kho là bắt buộc')
    .max(255, 'Tên kho tối đa 255 ký tự'),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const inventoryStockAdjustmentSchema = z.object({
  warehouseId: z.string().uuid('Kho không hợp lệ'),
  itemId: z.string().uuid('Vật tư không hợp lệ'),
  quantityOnHand: z.coerce
    .number({ error: 'Số tồn phải là số' })
    .min(0, 'Số tồn không được âm'),
  note: z.string().trim().optional(),
});

export const inventoryStockMovementSchema = z.object({
  type: z.enum(['in', 'out']),
  warehouseId: z.string().uuid('Kho không hợp lệ'),
  itemId: z.string().uuid('Vật tư không hợp lệ'),
  workOrderId: z.string().uuid('Lệnh thi công không hợp lệ').optional(),
  quantity: z.coerce
    .number({ error: 'Số lượng phải là số' })
    .positive('Số lượng phải lớn hơn 0'),
  note: z.string().trim().optional(),
});

export type WarehouseFilters = z.infer<typeof warehouseFiltersSchema>;
export type WarehouseFormInput = z.infer<typeof warehouseFormSchema>;
export type InventoryStockAdjustmentInput = z.infer<
  typeof inventoryStockAdjustmentSchema
>;
export type InventoryStockMovementInput = z.infer<
  typeof inventoryStockMovementSchema
>;
