import { z } from 'zod';

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

const optionalUuid = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().uuid().optional(),
);

export const auditLogFiltersSchema = z.object({
  q: optionalTrimmedString,
  userId: optionalUuid,
  resource: optionalTrimmedString,
  action: optionalTrimmedString,
  from: optionalTrimmedString,
  to: optionalTrimmedString,
});

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;
