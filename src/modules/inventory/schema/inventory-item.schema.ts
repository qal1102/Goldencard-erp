import { z } from 'zod';

export const inventoryItemFiltersSchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(['all', 'active', 'inactive']).optional(),
});

const numberFromInput = z.coerce
  .number({ error: 'Tồn tối thiểu phải là số' })
  .min(0, 'Tồn tối thiểu không được âm');

export const inventoryItemFormSchema = z.object({
  sku: z
    .string()
    .trim()
    .max(80, 'Mã vật tư tối đa 80 ký tự'),
  name: z
    .string()
    .trim()
    .min(1, 'Tên vật tư là bắt buộc')
    .max(255, 'Tên vật tư tối đa 255 ký tự'),
  category: z.string().trim().max(120, 'Nhóm vật tư tối đa 120 ký tự').optional(),
  specification: z.string().trim().max(255, 'Quy cách/kích cỡ tối đa 255 ký tự').optional(),
  imageUrl: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, 'Link ảnh không hợp lệ')
    .optional(),
  unit: z
    .string()
    .trim()
    .min(1, 'Đơn vị tính là bắt buộc')
    .max(50, 'Đơn vị tính tối đa 50 ký tự'),
  minStock: numberFromInput.default(0),
  isSerializable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  note: z.string().trim().optional(),
});

export type InventoryItemFilters = z.infer<typeof inventoryItemFiltersSchema>;
export type InventoryItemFormInput = z.infer<typeof inventoryItemFormSchema>;
