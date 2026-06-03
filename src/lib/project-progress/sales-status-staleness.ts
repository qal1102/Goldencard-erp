import type { LeadStatus } from '@/modules/crm/schema/lead.schema';
import type { ProjectContext } from './types';

/** Approximate pipeline position for manual CRM lead statuses (sales/contact only). */
const LEAD_SALES_STATUS_ORDER: Record<LeadStatus, number> = {
  new: 5,
  contacting: 8,
  consulting: 10,
  awaiting_survey: 12,
  quoted: 35,
  negotiating: 38,
  won: 42,
  lost: -1,
};

/**
 * Approximate pipeline position from linked downstream ERP records.
 * Higher = further along delivery (work order > contract > quotation > survey > lead).
 */
export function getDerivedPipelineOrder(ctx: ProjectContext): number {
  const handover = ctx.records.handover;
  if (handover) {
    if (handover.status === 'completed') return 95;
    if (handover.status === 'cancelled') return 89;
    return 90;
  }

  const workOrder = ctx.records.work_order;
  if (workOrder) {
    if (workOrder.status === 'completed') return 85;
    if (workOrder.status === 'in_progress') return 80;
    if (workOrder.status === 'scheduled') return 76;
    if (workOrder.status === 'cancelled') return 74;
    return 75;
  }

  const contract = ctx.records.contract;
  if (contract) {
    if (contract.status === 'signed') return 70;
    if (contract.status === 'cancelled') return 64;
    return 65;
  }

  const quotation = ctx.records.quotation;
  if (quotation) {
    if (quotation.status === 'accepted') return 60;
    return 40;
  }

  const survey = ctx.records.survey;
  if (survey) {
    if (survey.status === 'completed') return 30;
    if (survey.status === 'cancelled') return 25;
    return 20;
  }

  return 10;
}

/** True when manual lead.status lags behind linked survey/quotation/contract/work order facts. */
export function isLeadSalesStatusStale(
  ctx: ProjectContext,
  leadStatus: LeadStatus,
): boolean {
  if (leadStatus === 'lost') return false;

  const leadOrder = LEAD_SALES_STATUS_ORDER[leadStatus];
  if (leadOrder < 0) return false;

  const derivedOrder = getDerivedPipelineOrder(ctx);
  return derivedOrder > leadOrder + 3;
}

export function hasDownstreamDeliveryRecords(ctx: ProjectContext): boolean {
  return Boolean(
    ctx.records.survey ||
      ctx.records.quotation ||
      ctx.records.contract ||
      ctx.records.work_order ||
      ctx.records.handover,
  );
}
