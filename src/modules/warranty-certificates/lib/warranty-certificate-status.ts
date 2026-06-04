import type { WarrantyCertificateStatus } from '../schema/warranty-certificate.schema';

type StatusInput = {
  status: string;
  warrantyEndAt: Date | string | null;
};

/** Derive display status: stored cancelled wins; else expire by end date. */
export function resolveWarrantyCertificateStatus(
  input: StatusInput,
): WarrantyCertificateStatus {
  if (input.status === 'cancelled') return 'cancelled';
  if (input.warrantyEndAt) {
    const end = new Date(input.warrantyEndAt);
    if (!Number.isNaN(end.getTime()) && end < new Date()) {
      return 'expired';
    }
  }
  if (input.status === 'expired') return 'expired';
  return 'active';
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
