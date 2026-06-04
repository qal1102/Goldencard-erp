import { z } from 'zod';

export const adminUserFiltersSchema = z.object({
  q: z.string().optional(),
  roleId: z.string().uuid().optional(),
});

export type AdminUserFilters = z.infer<typeof adminUserFiltersSchema>;

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().trim().email('Email không hợp lệ'),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  roleIds: z.array(z.string().uuid()).min(1, 'Chọn ít nhất một vai trò'),
  isActive: z.boolean().default(true),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

export const updateAdminUserSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().trim().email('Email không hợp lệ'),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  roleIds: z.array(z.string().uuid()).min(1, 'Chọn ít nhất một vai trò'),
  isActive: z.boolean(),
});

export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;

export const resetAdminUserPasswordSchema = z.object({
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export type ResetAdminUserPasswordInput = z.infer<typeof resetAdminUserPasswordSchema>;

export const setAdminUserActiveSchema = z.object({
  isActive: z.boolean(),
});

export type SetAdminUserActiveInput = z.infer<typeof setAdminUserActiveSchema>;
