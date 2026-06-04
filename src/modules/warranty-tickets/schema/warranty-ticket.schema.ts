import { z } from 'zod';

export const WARRANTY_TICKET_STATUSES = [
  'open',
  'assigned',
  'scheduled',
  'in_progress',
  'resolved',
  'cancelled',
] as const;
export type WarrantyTicketStatus = (typeof WARRANTY_TICKET_STATUSES)[number];

export const WARRANTY_TICKET_STATUS_LABELS: Record<WarrantyTicketStatus, string> = {
  open: 'Mới tiếp nhận',
  assigned: 'Đã phân công',
  scheduled: 'Đã hẹn xử lý',
  in_progress: 'Đang xử lý',
  resolved: 'Đã xử lý',
  cancelled: 'Đã hủy',
};

export const WARRANTY_TICKET_PRIORITIES = ['normal', 'important', 'urgent'] as const;
export type WarrantyTicketPriority = (typeof WARRANTY_TICKET_PRIORITIES)[number];

export const WARRANTY_TICKET_PRIORITY_LABELS: Record<WarrantyTicketPriority, string> = {
  normal: 'Bình thường',
  important: 'Quan trọng',
  urgent: 'Khẩn cấp',
};

export const WARRANTY_ACTIVE_STATUSES: WarrantyTicketStatus[] = [
  'open',
  'assigned',
  'scheduled',
  'in_progress',
];

export const WARRANTY_TICKET_STATUS_TRANSITIONS: Record<
  WarrantyTicketStatus,
  WarrantyTicketStatus[]
> = {
  open: ['assigned', 'scheduled', 'in_progress', 'resolved', 'cancelled'],
  assigned: ['scheduled', 'in_progress', 'resolved', 'cancelled'],
  scheduled: ['in_progress', 'resolved', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: [],
  cancelled: [],
};

export const warrantyTicketFiltersSchema = z.object({
  status: z.enum(WARRANTY_TICKET_STATUSES).optional(),
  priority: z.enum(WARRANTY_TICKET_PRIORITIES).optional(),
  customerId: z.string().uuid().optional(),
  handoverId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});

export type WarrantyTicketFilters = z.infer<typeof warrantyTicketFiltersSchema>;

export const createWarrantyTicketSchema = z.object({
  customerId: z.string().uuid(),
  leadId: z.string().uuid().nullable().optional(),
  surveyId: z.string().uuid().nullable().optional(),
  quotationId: z.string().uuid().nullable().optional(),
  contractId: z.string().uuid().nullable().optional(),
  workOrderId: z.string().uuid().nullable().optional(),
  handoverId: z.string().uuid().nullable().optional(),
  priority: z.enum(WARRANTY_TICKET_PRIORITIES).default('normal'),
  issueTitle: z.string().min(1, 'Vui lòng nhập tiêu đề').max(255),
  issueDescription: z.string().max(10000).nullable().optional(),
  customerContactName: z.string().max(255).nullable().optional(),
  customerContactPhone: z.string().max(50).nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

export type CreateWarrantyTicketInput = z.infer<typeof createWarrantyTicketSchema>;

export const updateWarrantyTicketAssignmentSchema = z.object({
  assignedTo: z.string().uuid().nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
});

export type UpdateWarrantyTicketAssignmentInput = z.infer<
  typeof updateWarrantyTicketAssignmentSchema
>;

export const resolveWarrantyTicketSchema = z.object({
  resolutionNote: z.string().min(1, 'Vui lòng nhập ghi chú xử lý').max(10000),
  documentLinks: z.string().max(10000).nullable().optional(),
});

export type ResolveWarrantyTicketInput = z.infer<typeof resolveWarrantyTicketSchema>;

export const updateWarrantyTicketStatusSchema = z.object({
  status: z.enum(WARRANTY_TICKET_STATUSES),
});

export type UpdateWarrantyTicketStatusInput = z.infer<typeof updateWarrantyTicketStatusSchema>;
