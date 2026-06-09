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

export type WarehouseFilters = z.infer<typeof warehouseFiltersSchema>;
export type WarehouseFormInput = z.infer<typeof warehouseFormSchema>;
