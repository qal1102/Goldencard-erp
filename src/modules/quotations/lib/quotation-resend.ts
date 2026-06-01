import type { QuotationStatus } from '../schema/quotation.schema';

type EditLogLike = { editedAt: Date | string };

export function computeLatestEditAt(editLogs: EditLogLike[]): Date | null {
  if (editLogs.length === 0) return null;

  let latest: Date | null = null;
  for (const log of editLogs) {
    const at = new Date(log.editedAt);
    if (!latest || at > latest) latest = at;
  }
  return latest;
}

/**
 * Derived flag — not stored in DB.
 * needsResend = status === 'sent' && latestEditAt > sentAt
 */
export function computeNeedsResend(params: {
  status: QuotationStatus | string;
  sentAt: Date | string | null | undefined;
  latestEditAt: Date | null;
}): boolean {
  if (params.status !== 'sent' || !params.sentAt || !params.latestEditAt) {
    return false;
  }
  return params.latestEditAt.getTime() > new Date(params.sentAt).getTime();
}

/** Statuses that allow direct content edit (not via revision). */
export const QUOTATION_EDITABLE_STATUSES = ['draft', 'sent'] as const;
export type QuotationEditableStatus = (typeof QUOTATION_EDITABLE_STATUSES)[number];

export function isQuotationEditable(status: QuotationStatus | string): boolean {
  return QUOTATION_EDITABLE_STATUSES.includes(status as QuotationEditableStatus);
}
