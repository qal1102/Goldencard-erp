import { z } from 'zod';

export const WARRANTY_CERTIFICATE_STATUSES = ['active', 'expired', 'cancelled'] as const;
export type WarrantyCertificateStatus = (typeof WARRANTY_CERTIFICATE_STATUSES)[number];

export const WARRANTY_CERTIFICATE_STATUS_LABELS: Record<WarrantyCertificateStatus, string> = {
  active: 'Còn hiệu lực',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
};

export const warrantyCertificateFiltersSchema = z.object({
  status: z.enum(WARRANTY_CERTIFICATE_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
  handoverId: z.string().uuid().optional(),
});

export type WarrantyCertificateFilters = z.infer<typeof warrantyCertificateFiltersSchema>;

export const DEFAULT_WARRANTY_TERMS = `1. GoldenCard bảo hành hệ thống điện mặt trời theo điều kiện kỹ thuật đã bàn giao.
2. Khách hàng vui lòng giữ phiếu bảo hành và liên hệ hotline khi cần hỗ trợ.
3. Bảo hành không áp dụng cho hư hỏng do sử dụng sai, thiên tai hoặc can thiệp trái phép.`;

export const publicWarrantySupportSchema = z.object({
  publicToken: z.string().min(32).max(100),
  issueTitle: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(255),
  issueDescription: z.string().trim().max(5000).optional(),
  contactName: z.string().trim().max(255).optional(),
  contactPhone: z.string().trim().max(50).optional(),
  documentLinks: z.string().trim().max(2000).optional(),
});

export type PublicWarrantySupportInput = z.infer<typeof publicWarrantySupportSchema>;
