import { z } from 'zod';

export const WORK_ORDER_MATERIAL_STATUSES = [
  'planned',
  'approved',
  'partially_issued',
  'issued',
  'cancelled',
] as const;
export type WorkOrderMaterialStatus = (typeof WORK_ORDER_MATERIAL_STATUSES)[number];

export const WORK_ORDER_MATERIAL_STATUS_LABELS: Record<WorkOrderMaterialStatus, string> = {
  planned: 'Dự trù',
  approved: 'Đã duyệt',
  partially_issued: 'Đã xuất một phần',
  issued: 'Đã xuất đủ',
  cancelled: 'Đã hủy',
};

const quantitySchema = z.coerce
  .number({ error: 'Số lượng phải là số' })
  .positive('Số lượng phải lớn hơn 0')
  .max(999999, 'Số lượng quá lớn');

export const workOrderMaterialFormSchema = z.object({
  itemId: z.string().uuid('Vật tư không hợp lệ'),
  plannedQuantity: quantitySchema,
  note: z.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').optional(),
});

export const updateWorkOrderMaterialSchema = workOrderMaterialFormSchema.pick({
  plannedQuantity: true,
  note: true,
});

export type WorkOrderMaterialFormInput = z.infer<typeof workOrderMaterialFormSchema>;
export type UpdateWorkOrderMaterialInput = z.infer<typeof updateWorkOrderMaterialSchema>;
