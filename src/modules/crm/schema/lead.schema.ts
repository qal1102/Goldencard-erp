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

export const ACTIVITY_TYPES = ['note', 'call', 'status_change', 'assignment_change'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Ghi chú',
  call: 'Cuộc gọi',
  status_change: 'Cập nhật trạng thái',
  assignment_change: 'Phân công',
};

export const createLeadSchema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(255),
  phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .max(12, 'Số điện thoại không hợp lệ')
    .regex(/^\d+$/, 'Chỉ nhập số'),
  email: z.string().email('Email không hợp lệ').max(255).optional(),
  address: z.string().max(1000).optional(),
  province: z.string().max(100).optional(),
  source: z.enum(LEAD_SOURCES),
  expectedCapacity: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  assignedTo: z.string().uuid('ID người dùng không hợp lệ').nullable().optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial();
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
