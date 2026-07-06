import { z } from 'zod';

export const quotationPriceCatalogStatusSchema = z
  .enum(['all', 'active', 'inactive'])
  .default('active');

export const quotationPriceCatalogFiltersSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    status: quotationPriceCatalogStatusSchema.optional(),
  })
  .default({});

export type QuotationPriceCatalogFilters = z.infer<
  typeof quotationPriceCatalogFiltersSchema
>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null));

export const quotationPriceCatalogFormSchema = z.object({
  inventoryItemId: z
    .string()
    .uuid('Vật tư kho không hợp lệ')
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  displayName: z
    .string()
    .trim()
    .min(2, 'Tên hiển thị cần ít nhất 2 ký tự')
    .max(255, 'Tên hiển thị tối đa 255 ký tự'),
  description: optionalText(1000),
  category: optionalText(120),
  unit: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập đơn vị tính')
    .max(50, 'Đơn vị tính tối đa 50 ký tự'),
  unitPrice: z.coerce.number().min(0, 'Đơn giá không được âm'),
  isMainEquipment: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  note: optionalText(1000),
});

export type QuotationPriceCatalogFormInput = z.infer<
  typeof quotationPriceCatalogFormSchema
>;
