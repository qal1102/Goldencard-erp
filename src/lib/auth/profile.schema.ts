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
  jobTitle: z.string().trim().max(150, 'Chức danh tối đa 150 ký tự').optional().or(z.literal('')),
  avatarUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        !value ||
        value.startsWith('data:image/png;base64,') ||
        value.startsWith('data:image/jpeg;base64,') ||
        value.startsWith('data:image/webp;base64,') ||
        /^https?:\/\//.test(value),
      'Avatar phải là ảnh PNG/JPG/WebP hoặc link ảnh hợp lệ',
    )
    .max(300_000, 'Ảnh avatar quá lớn, vui lòng chọn ảnh nhỏ hơn')
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
