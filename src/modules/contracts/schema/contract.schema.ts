import { z } from 'zod';

export const CONTRACT_STATUSES = ['draft', 'prepared', 'signed', 'cancelled'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Nháp',
  prepared: 'Chờ ký',
  signed: 'Đã ký',
  cancelled: 'Đã hủy',
};

export const CONTRACT_STATUS_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['prepared', 'cancelled'],
  prepared: ['signed', 'cancelled'],
  signed: [],
  cancelled: [],
};

export const contractFiltersSchema = z.object({
  status: z.enum(CONTRACT_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
});

export type ContractFilters = z.infer<typeof contractFiltersSchema>;

export const updateContractNoteSchema = z.object({
  note: z.string().max(5000).nullable().optional(),
});

export type UpdateContractNoteInput = z.infer<typeof updateContractNoteSchema>;

export const updateContractInfoSchema = z.object({
  signedDocumentUrl: z.string().max(2000).nullable().optional(),
  customerSignerName: z.string().max(255).nullable().optional(),
  goldenCardSignerName: z.string().max(255).nullable().optional(),
  note: z.string().max(5000).nullable().optional(),
});

export type UpdateContractInfoInput = z.infer<typeof updateContractInfoSchema>;

export const updateContractStatusSchema = z.object({
  status: z.enum(CONTRACT_STATUSES),
});

export type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>;

export const createContractFromQuotationSchema = z.object({
  quotationId: z.string().uuid(),
  note: z.string().max(5000).optional(),
});

export type CreateContractFromQuotationInput = z.infer<
  typeof createContractFromQuotationSchema
>;
