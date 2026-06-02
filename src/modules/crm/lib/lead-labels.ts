import {
  CALL_RESULT_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  type CallResult,
  type LeadSource,
  type LeadStatus,
} from '../schema/lead.schema';

export function getLeadStatusLabel(status: string | null | undefined): string {
  if (!status) return '';
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
}

export function getLeadSourceLabel(source: string | null | undefined): string {
  if (!source) return '';
  return LEAD_SOURCE_LABELS[source as LeadSource] ?? source;
}

export function getCallResultLabel(value: string | null | undefined): string {
  if (!value) return '';
  return CALL_RESULT_LABELS[value as CallResult] ?? value;
}

export function getAssignableUserLabel(
  userId: string | null | undefined,
  users: { id: string; name: string }[],
): string {
  if (!userId) return '';
  return users.find((u) => u.id === userId)?.name ?? userId;
}
