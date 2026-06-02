import { z } from 'zod';

export const updateAddressSchema = z.object({
  address: z.string().min(1, 'Địa chỉ là bắt buộc').max(1000, 'Địa chỉ quá dài'),
  province: z.string().max(100).optional(),
});

export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

export const updateSurveyAddressSchema = updateAddressSchema.extend({
  editNote: z.string().max(2000).optional(),
});

export type UpdateSurveyAddressInput = z.infer<typeof updateSurveyAddressSchema>;
