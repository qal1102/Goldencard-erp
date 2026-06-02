import { z } from 'zod';

const phoneSchema = z
  .string()
  .min(9, 'Số điện thoại phải có 9–11 chữ số')
  .max(11, 'Số điện thoại phải có 9–11 chữ số')
  .regex(/^\d+$/, 'Chỉ nhập số');

export const convertLeadSchema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(255),
  phone: phoneSchema,
  // Allow '' from blank HTML input; toNull() converts '' → null server-side
  email: z
    .string()
    .max(255)
    .optional()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      'Email không hợp lệ',
    ),
  address: z.string().min(1, 'Địa chỉ là bắt buộc').max(1000, 'Địa chỉ quá dài'),
  province: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  // Referral info carried forward from lead — commission deferred to accounting/finance module (TODO)
  referrerName: z.string().max(255).optional(),
  referrerPhone: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{9,11}$/.test(v.trim()),
      'Số điện thoại phải có 9–11 chữ số và chỉ chứa số',
    ),
  referralNote: z.string().max(2000).optional(),
});
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

export const customerFiltersSchema = z.object({
  search: z.string().optional(),
});
export type CustomerFilters = z.infer<typeof customerFiltersSchema>;

export { updateAddressSchema as updateCustomerAddressSchema } from '@/lib/address/address.schema';
export type { UpdateAddressInput as UpdateCustomerAddressInput } from '@/lib/address/address.schema';
