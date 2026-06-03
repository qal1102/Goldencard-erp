import { z } from 'zod';

export const WORK_ORDER_STATUSES = [
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: 'Nháp',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang thi công',
  completed: 'Hoàn thành thi công',
  cancelled: 'Đã hủy',
};

export const WORK_ORDER_STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const workOrderFiltersSchema = z.object({
  status: z.enum(WORK_ORDER_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

export type WorkOrderFilters = z.infer<typeof workOrderFiltersSchema>;

export const createWorkOrderFromContractSchema = z.object({
  contractId: z.string().uuid(),
});

export type CreateWorkOrderFromContractInput = z.infer<
  typeof createWorkOrderFromContractSchema
>;

export const updateWorkOrderInfoSchema = z.object({
  assignedTo: z.string().uuid().nullable().optional(),
  scheduledStartAt: z.coerce.date().nullable().optional(),
  scheduledEndAt: z.coerce.date().nullable().optional(),
  note: z.string().max(5000).nullable().optional(),
});

export type UpdateWorkOrderInfoInput = z.infer<typeof updateWorkOrderInfoSchema>;

export const updateWorkOrderStatusSchema = z.object({
  status: z.enum(WORK_ORDER_STATUSES),
});

export type UpdateWorkOrderStatusInput = z.infer<typeof updateWorkOrderStatusSchema>;

export const completeWorkOrderSchema = z.object({
  completionNote: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập ghi chú hoàn thành thi công'),
  completionDocumentLinks: z.string().max(10000).nullable().optional(),
});

export type CompleteWorkOrderInput = z.infer<typeof completeWorkOrderSchema>;
