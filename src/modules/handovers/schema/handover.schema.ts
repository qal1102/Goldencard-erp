import { z } from 'zod';

export const HANDOVER_STATUSES = [
  'draft',
  'pending_customer',
  'completed',
  'cancelled',
] as const;
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  draft: 'Nháp',
  pending_customer: 'Chờ khách xác nhận',
  completed: 'Đã bàn giao',
  cancelled: 'Đã hủy',
};

export const HANDOVER_STATUS_TRANSITIONS: Record<HandoverStatus, HandoverStatus[]> = {
  draft: ['pending_customer', 'completed', 'cancelled'],
  pending_customer: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const handoverFiltersSchema = z.object({
  status: z.enum(HANDOVER_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
});

export type HandoverFilters = z.infer<typeof handoverFiltersSchema>;

export const createHandoverFromWorkOrderSchema = z.object({
  workOrderId: z.string().uuid(),
});

export type CreateHandoverFromWorkOrderInput = z.infer<
  typeof createHandoverFromWorkOrderSchema
>;

export const updateHandoverInfoSchema = z.object({
  customerReceiverName: z.string().max(255).nullable().optional(),
  documentLinks: z.string().max(10000).nullable().optional(),
  note: z.string().max(5000).nullable().optional(),
  handoverAt: z.coerce.date().nullable().optional(),
});

export type UpdateHandoverInfoInput = z.infer<typeof updateHandoverInfoSchema>;

export const updateHandoverStatusSchema = z.object({
  status: z.enum(HANDOVER_STATUSES),
});

export type UpdateHandoverStatusInput = z.infer<typeof updateHandoverStatusSchema>;
