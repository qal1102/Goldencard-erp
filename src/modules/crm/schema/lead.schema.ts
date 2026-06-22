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

export const LEAD_SALES_FILTERS = [
  'unassigned',
  'not_contacted',
  'overdue_follow_up',
] as const;
export type LeadSalesFilter = (typeof LEAD_SALES_FILTERS)[number];

export const LEAD_SALES_FILTER_LABELS: Record<LeadSalesFilter, string> = {
  unassigned: 'Chưa phân công',
  not_contacted: 'Chưa liên hệ',
  overdue_follow_up: 'Quá hẹn gọi lại',
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
  'call_attempt',
  'call_result',
  'status_change',
  'assignment_change',
  'conversion',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Ghi chú',
  call: 'Ghi nhận cuộc gọi',
  call_attempt: 'Bấm gọi khách',
  call_result: 'Kết quả cuộc gọi',
  status_change: 'Cập nhật trạng thái',
  assignment_change: 'Phân công',
  conversion: 'Chuyển đổi khách hàng',
};

export const CALL_RESULTS = [
  'no_answer',
  'consulted',
  'call_back',
  'survey_agreed',
  'not_interested',
  'wrong_number',
] as const;
export type CallResult = (typeof CALL_RESULTS)[number];

export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  no_answer: 'Không bắt máy',
  consulted: 'Đã tư vấn',
  call_back: 'Hẹn gọi lại',
  survey_agreed: 'Hẹn khảo sát',
  not_interested: 'Không có nhu cầu',
  wrong_number: 'Sai số',
};

export type LeadConsultationContext = {
  customerRequirements?: string | null;
  consultationNote?: string | null;
  preferredInstallTime?: string | null;
  followUpAt?: Date | string | null;
  lastCallResult?: string | null;
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
  /** When set, link new opportunity to this existing customer master (no duplicate customer). */
  customerId: z.string().uuid('ID khách hàng không hợp lệ').optional(),
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

export const submitCallResultSchema = z.object({
  callResult: z.enum(CALL_RESULTS),
  note: z.string().max(2000).optional(),
  followUpAt: z.string().optional(),
  customerRequirements: z.string().max(5000).optional(),
});
export type SubmitCallResultInput = z.infer<typeof submitCallResultSchema>;

export const leadFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  assignedTo: z.string().uuid().optional(),
  salesFilter: z.enum(LEAD_SALES_FILTERS).optional(),
});
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
