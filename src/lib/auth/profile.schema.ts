import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập tên hiển thị').max(255),
  phone: z
    .string()
    .trim()
    .max(20, 'Số điện thoại tối đa 20 ký tự')
    .regex(/^[0-9+\-\s().]*$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  avatarUrl: z
    .string()
    .trim()
    .url('Avatar phải là link ảnh hợp lệ')
    .max(1000, 'Link avatar quá dài')
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
