import { z } from 'zod';

export const QUOTATION_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'needs_revision',
  'no_response',
  'expired',
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Nháp',
  sent: 'Đã gửi cho khách',
  accepted: 'Khách đồng ý',
  rejected: 'Khách từ chối',
  needs_revision: 'Cần chỉnh báo giá',
  no_response: 'Không phản hồi',
  expired: 'Hết hiệu lực',
};

/** Customer response outcomes — recorded via recordQuotationResponseAction. */
export const QUOTATION_RESPONSE_STATUSES = [
  'accepted',
  'rejected',
  'needs_revision',
  'no_response',
  'expired',
] as const;
export type QuotationResponseStatus = (typeof QUOTATION_RESPONSE_STATUSES)[number];

/** Statuses from which a new revision may be created. */
export const REVISION_SOURCE_STATUSES = [
  'needs_revision',
  'rejected',
  'expired',
  'no_response',
] as const;
export type RevisionSourceStatus = (typeof REVISION_SOURCE_STATUSES)[number];

/**
 * Allowed transitions for updateQuotationStatusAction (legacy).
 * Draft → sent and sent → response use dedicated actions instead.
 */
export const QUOTATION_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: [],
  sent: [],
  accepted: [],
  rejected: [],
  needs_revision: [],
  no_response: [],
  expired: [],
};

export const QUOTATION_SENT_CHANNELS = ['zalo', 'email', 'print', 'other'] as const;
export type QuotationSentChannel = (typeof QUOTATION_SENT_CHANNELS)[number];

export const QUOTATION_EXPORT_FORMATS = ['xlsx', 'pdf'] as const;
export type QuotationExportFormat = (typeof QUOTATION_EXPORT_FORMATS)[number];

// ---------------------------------------------------------------------------
// Line-item sub-schema (shared by create and update)
// ---------------------------------------------------------------------------
const quotationItemSchema = z.object({
  productName: z
    .string()
    .min(1, 'Tên sản phẩm là bắt buộc')
    .max(255, 'Tên sản phẩm quá dài'),
  description: z.string().max(1000, 'Mô tả quá dài').optional(),
  quantity: z.number().positive('Số lượng phải lớn hơn 0'),
  unit: z
    .string()
    .min(1, 'Đơn vị tính là bắt buộc')
    .max(50, 'Đơn vị tính quá dài')
    .refine(
      (value) => !/^\d+([.,]\d+)?$/.test(value.trim()),
      'Đơn vị tính không được là số. Ví dụ: tấm, bộ, m, m².',
    ),
  unitPrice: z.number().min(0, 'Đơn giá không được âm'),
});
export type QuotationItemInput = z.infer<typeof quotationItemSchema>;

// ---------------------------------------------------------------------------
// validUntil refinement (reused in create and update)
// ---------------------------------------------------------------------------
const validUntilField = z
  .string()
  .optional()
  .refine(
    (v) => {
      if (!v?.trim()) return true;
      const d = new Date(v);
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d >= today;
    },
    { message: 'Ngày hết hạn không được ở quá khứ' },
  );

// ---------------------------------------------------------------------------
// Discount / VAT helpers
// ---------------------------------------------------------------------------
export const DISCOUNT_TYPES = ['amount', 'percent'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const VAT_PRESETS = [0, 8, 10] as const;
export type VatPreset = (typeof VAT_PRESETS)[number];

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export const createQuotationSchema = z.object({
  surveyId: z.string().uuid('ID khảo sát không hợp lệ'),
  validUntil: validUntilField,
  note: z.string().max(2000, 'Ghi chú quá dài').optional(),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.number().min(0, 'Chiết khấu không được âm'),
  vatRate: z
    .number()
    .min(0, 'Thuế VAT không được âm')
    .max(100, 'Thuế VAT không được vượt quá 100%'),
  items: z.array(quotationItemSchema).min(1, 'Báo giá phải có ít nhất 1 dòng hàng'),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

// ---------------------------------------------------------------------------
// Update (no surveyId — cannot change the linked survey after creation)
// ---------------------------------------------------------------------------
export const updateQuotationSchema = z.object({
  validUntil: validUntilField,
  note: z.string().max(2000, 'Ghi chú quá dài').optional(),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.number().min(0, 'Chiết khấu không được âm'),
  vatRate: z
    .number()
    .min(0, 'Thuế VAT không được âm')
    .max(100, 'Thuế VAT không được vượt quá 100%'),
  items: z.array(quotationItemSchema).min(1, 'Báo giá phải có ít nhất 1 dòng hàng'),
  /** Required when editing a sent quotation — validated server-side. */
  editNote: z.string().max(2000, 'Ghi chú thay đổi quá dài').optional(),
});
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;

// ---------------------------------------------------------------------------
// Status update (legacy — prefer dedicated workflow actions)
// ---------------------------------------------------------------------------
export const updateQuotationStatusSchema = z.object({
  status: z.enum(QUOTATION_STATUSES),
});
export type UpdateQuotationStatusInput = z.infer<typeof updateQuotationStatusSchema>;

// ---------------------------------------------------------------------------
// Export / send / response / revision
// ---------------------------------------------------------------------------
export const recordQuotationExportSchema = z.object({
  format: z.enum(QUOTATION_EXPORT_FORMATS),
});
export type RecordQuotationExportInput = z.infer<typeof recordQuotationExportSchema>;

export const markQuotationSentSchema = z.object({
  sentChannel: z.enum(QUOTATION_SENT_CHANNELS),
  sentNote: z.string().max(2000, 'Ghi chú quá dài').optional(),
});
export type MarkQuotationSentInput = z.infer<typeof markQuotationSentSchema>;

export const recordQuotationResponseSchema = z.object({
  status: z.enum(QUOTATION_RESPONSE_STATUSES),
  responseNote: z.string().max(2000, 'Ghi chú quá dài').optional(),
});
export type RecordQuotationResponseInput = z.infer<typeof recordQuotationResponseSchema>;

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------
export const quotationFiltersSchema = z.object({
  status: z.enum(QUOTATION_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
});
export type QuotationFilters = z.infer<typeof quotationFiltersSchema>;
