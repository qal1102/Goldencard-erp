import { z } from 'zod';

export const ADMIN_USER_VALIDATION_ERROR =
  'Dữ liệu tài khoản chưa hợp lệ. Vui lòng kiểm tra lại thông tin.';

export const USER_ACTIVE_AUDIT_ACTIONS = {
  activate: 'user.activate',
  deactivate: 'user.deactivate',
} as const;

/** Accepts null, undefined, or string; stores null when empty. */
export const optionalNullablePhoneSchema = z.preprocess(
  (val) => (val == null ? '' : val),
  z.string().trim().transform((v) => (v.length > 0 ? v : null)),
);

/** Accepts null, undefined, or string; omits empty values on create. */
const optionalPhoneForCreateSchema = z.preprocess(
  (val) => (val == null ? '' : val),
  z.string().trim().transform((v) => (v.length > 0 ? v : undefined)),
);

export const adminUserFiltersSchema = z.object({
  q: z.string().optional(),
  roleId: z.string().uuid().optional(),
});

export type AdminUserFilters = z.infer<typeof adminUserFiltersSchema>;

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().trim().email('Email không hợp lệ'),
  phone: optionalPhoneForCreateSchema,
  jobTitle: z.string().trim().max(150, 'Chức danh tối đa 150 ký tự').optional(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  roleIds: z.array(z.string().uuid()).min(1, 'Chọn ít nhất một vai trò'),
  isActive: z.boolean().default(true),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

export const updateAdminUserSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().trim().email('Email không hợp lệ'),
  phone: optionalNullablePhoneSchema,
  jobTitle: z.string().trim().max(150, 'Chức danh tối đa 150 ký tự').nullable().optional(),
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
