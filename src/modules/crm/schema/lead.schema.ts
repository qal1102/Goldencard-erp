import { z } from 'zod';

export const LEAD_STATUSES = [
  'new',
  'contacting',
  'consulting',
  'awaiting_survey',
  'quoted',
  'negotiating',
  'won',
  'lost',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Mới',
  contacting: 'Đang liên hệ',
  consulting: 'Đang tư vấn',
  awaiting_survey: 'Chờ khảo sát',
  quoted: 'Đã báo giá',
  negotiating: 'Đang đàm phán',
  won: 'Chốt hợp đồng',
  lost: 'Không tiến hành',
};

export const LEAD_SOURCES = [
  'zalo',
  'facebook',
  'referral',
  'website',
  'direct',
  'other',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  zalo: 'Zalo',
  facebook: 'Facebook',
  referral: 'Giới thiệu',
  website: 'Website',
  direct: 'Trực tiếp',
  other: 'Khác',
};

export const ACTIVITY_TYPES = [
  'note',
  'call',
  'status_change',
  'assignment_change',
  'conversion',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Ghi chú',
  call: 'Ghi nhận cuộc gọi',
  status_change: 'Cập nhật trạng thái',
  assignment_change: 'Phân công',
  conversion: 'Chuyển đổi khách hàng',
};

const phoneSchema = z
  .string()
  .min(9, 'Số điện thoại phải có 9–11 chữ số')
  .max(11, 'Số điện thoại phải có 9–11 chữ số')
  .regex(/^\d+$/, 'Chỉ nhập số');

// Base schema shared between create (strict) and update (partial).
//
// For optional string fields we use plain z.string().optional() — HTML inputs always return ''
// for blank fields, so empty strings pass through here. The server action's toNull() helper
// converts '' to null before the DB insert, so no z.preprocess is needed.
//
// email and referrerPhone are special: their format validators (email regex, min-length phone)
// would reject '' even though the field is optional. We use .refine() so '' is treated as
// "not provided" without triggering the format error. toNull() handles '' → null server-side.
const leadInputBase = z.object({
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
  source: z.enum(LEAD_SOURCES),
  expectedCapacity: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  assignedTo: z.string().uuid('ID người dùng không hợp lệ').nullable().optional(),
  // Referral info — commission calculation deferred to accounting/finance module (TODO)
  referrerName: z.string().max(255).optional(),
  // Allow '' from blank HTML input; toNull() converts '' → null server-side
  referrerPhone: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{9,11}$/.test(v.trim()),
      'Số điện thoại phải có 9–11 chữ số và chỉ chứa số',
    ),
  referralNote: z.string().max(2000).optional(),
});

export const createLeadSchema = leadInputBase.superRefine((data, ctx) => {
  if (data.source === 'referral' && !data.referrerName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Vui lòng nhập tên người giới thiệu',
      path: ['referrerName'],
    });
  }
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = leadInputBase.partial();
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const updateLeadStatusSchema = z
  .object({
    status: z.enum(LEAD_STATUSES),
    lostReason: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'lost' && (!data.lostReason || data.lostReason.trim().length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập lý do không tiến hành (ít nhất 5 ký tự)',
        path: ['lostReason'],
      });
    }
  });
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

export const addLeadNoteSchema = z.object({
  content: z.string().min(1, 'Nội dung không được trống').max(2000),
  type: z.enum(['note', 'call'] as const),
});
export type AddLeadNoteInput = z.infer<typeof addLeadNoteSchema>;

export const leadFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  assignedTo: z.string().uuid().optional(),
});
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
