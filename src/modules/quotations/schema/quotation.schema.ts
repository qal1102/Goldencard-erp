import { z } from 'zod';

export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Nháp',
  sent: 'Đã gửi',
  accepted: 'Đã chấp nhận',
  rejected: 'Từ chối',
  expired: 'Hết hạn',
};

/** Allowed transitions: from status → list of valid target statuses */
export const QUOTATION_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
};

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
  unit: z.string().min(1, 'Đơn vị là bắt buộc').max(50, 'Đơn vị quá dài'),
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
});
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;

// ---------------------------------------------------------------------------
// Status update
// ---------------------------------------------------------------------------
export const updateQuotationStatusSchema = z.object({
  status: z.enum(QUOTATION_STATUSES),
});
export type UpdateQuotationStatusInput = z.infer<typeof updateQuotationStatusSchema>;

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------
export const quotationFiltersSchema = z.object({
  status: z.enum(QUOTATION_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
});
export type QuotationFilters = z.infer<typeof quotationFiltersSchema>;
