import 'server-only';

import { desc, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  CONTRACT_STATUS_LABELS,
  type ContractStatus,
} from '@/modules/contracts/schema/contract.schema';
import {
  contracts,
  handovers,
  warrantyTickets,
  leads,
  quotationEditLogs,
  quotations,
  surveys,
  users,
  workOrders,
} from '@/db/schema';
import {
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderStatus,
} from '@/modules/work-orders/schema/work-order.schema';
import {
  HANDOVER_STATUS_LABELS,
  type HandoverStatus,
} from '@/modules/handovers/schema/handover.schema';
import { getLeadStatusLabel } from '@/modules/crm/lib/lead-labels';
import { computeNeedsResend } from '@/modules/quotations/lib/quotation-resend';
import {
  QUOTATION_STATUS_LABELS,
  type QuotationStatus,
} from '@/modules/quotations/schema/quotation.schema';
import {
  SURVEY_STATUS_LABELS,
  type SurveyStatus,
} from '@/modules/surveys/schema/survey.schema';
import {
  WARRANTY_TICKET_STATUS_LABELS,
  type WarrantyTicketStatus,
} from '@/modules/warranty-tickets/schema/warranty-ticket.schema';
import { buildRecordRef } from '../modules';
import { pickDrivingWarrantyTicket } from '../lib/pick-driving-warranty-ticket';
import type { ProjectContext, ProjectResponsible } from '../types';

function latestSurveyPerLead<
  T extends {
    leadId: string | null;
    updatedAt: Date;
    createdAt: Date;
    assignedTo: string | null;
  },
>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!row.leadId) continue;
    const existing = map.get(row.leadId);
    if (
      !existing ||
      row.updatedAt > existing.updatedAt ||
      (row.updatedAt.getTime() === existing.updatedAt.getTime() &&
        row.createdAt > existing.createdAt)
    ) {
      map.set(row.leadId, row);
    }
  }
  return map;
}

function latestQuotationPerSurvey<
  T extends { surveyId: string; revisionNumber: number },
>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const existing = map.get(row.surveyId);
    if (!existing || row.revisionNumber > existing.revisionNumber) {
      map.set(row.surveyId, row);
    }
  }
  return map;
}

function formatQuotationDetail(revisionNumber: number, grandTotal: string): string {
  return `v${revisionNumber} · ${grandTotal}`;
}

function formatContractDetail(contractValue: string): string {
  return contractValue;
}

function resolveResponsible(
  leadAssignedTo: string | null,
  surveyAssignedTo: string | null,
  userNames: Map<string, string>,
): ProjectResponsible | null {
  if (surveyAssignedTo) {
    return {
      userId: surveyAssignedTo,
      name: userNames.get(surveyAssignedTo) ?? null,
      role: 'technician',
      roleLabel: 'Kỹ thuật viên',
    };
  }
  if (leadAssignedTo) {
    return {
      userId: leadAssignedTo,
      name: userNames.get(leadAssignedTo) ?? null,
      role: 'sales',
      roleLabel: 'Phụ trách cơ hội',
    };
  }
  return null;
}

function attachWorkOrderAndHandover(
  records: ProjectContext['records'],
  workOrderRow: { id: string; code: string; status: string },
  handoverByWorkOrderId: Map<
    string,
    { id: string; code: string; status: string; workOrderId: string }
  >,
) {
  records.work_order = buildRecordRef({
    module: 'work_order',
    entityId: workOrderRow.id,
    code: workOrderRow.code,
    status: workOrderRow.status,
    statusLabel:
      WORK_ORDER_STATUS_LABELS[workOrderRow.status as WorkOrderStatus] ??
      workOrderRow.status,
  });

  const handoverRow = handoverByWorkOrderId.get(workOrderRow.id);
  if (handoverRow) {
    records.handover = buildRecordRef({
      module: 'handover',
      entityId: handoverRow.id,
      code: handoverRow.code,
      status: handoverRow.status,
      statusLabel:
        HANDOVER_STATUS_LABELS[handoverRow.status as HandoverStatus] ?? handoverRow.status,
    });
  }
}

/**
 * Loads project context for lead anchors (batch-safe).
 * Additional anchors (customer, contract, …) get their own providers later.
 */
export async function loadProjectContextForLeadAnchors(
  leadIds: string[],
): Promise<Map<string, ProjectContext>> {
  const uniqueIds = [...new Set(leadIds)].filter(Boolean);
  const contextMap = new Map<string, ProjectContext>();
  if (uniqueIds.length === 0) return contextMap;

  const leadRows = await db.query.leads.findMany({
    where: inArray(leads.id, uniqueIds),
    columns: {
      id: true,
      code: true,
      fullName: true,
      status: true,
      assignedTo: true,
    },
  });

  const surveyRows = await db.query.surveys.findMany({
    where: inArray(surveys.leadId, uniqueIds),
    columns: {
      id: true,
      code: true,
      status: true,
      leadId: true,
      updatedAt: true,
      createdAt: true,
      assignedTo: true,
    },
    orderBy: [desc(surveys.updatedAt)],
  });
  const surveyByLeadId = latestSurveyPerLead(surveyRows);

  const surveyIds = [...surveyByLeadId.values()].map((s) => s.id);
  const quotationRows =
    surveyIds.length > 0
      ? await db.query.quotations.findMany({
          where: inArray(quotations.surveyId, surveyIds),
          columns: {
            id: true,
            code: true,
            status: true,
            surveyId: true,
            revisionNumber: true,
            grandTotal: true,
            sentAt: true,
          },
        })
      : [];
  const quotationBySurveyId = latestQuotationPerSurvey(quotationRows);

  const quotationIds = [...quotationBySurveyId.values()].map((q) => q.id);

  const contractRows =
    quotationIds.length > 0
      ? await db.query.contracts.findMany({
          where: inArray(contracts.quotationId, quotationIds),
          columns: {
            id: true,
            code: true,
            status: true,
            quotationId: true,
            contractValue: true,
          },
        })
      : [];
  const contractByQuotationId = new Map(
    contractRows.map((c) => [c.quotationId, c]),
  );

  const contractIds = contractRows.map((c) => c.id);
  const [workOrderByContractRows, workOrderByLeadRows] = await Promise.all([
    contractIds.length > 0
      ? db.query.workOrders.findMany({
          where: inArray(workOrders.contractId, contractIds),
          columns: {
            id: true,
            code: true,
            status: true,
            contractId: true,
            leadId: true,
          },
        })
      : Promise.resolve([]),
    db.query.workOrders.findMany({
      where: inArray(workOrders.leadId, uniqueIds),
      columns: {
        id: true,
        code: true,
        status: true,
        contractId: true,
        leadId: true,
      },
    }),
  ]);
  const workOrderByContractId = new Map(
    workOrderByContractRows.map((wo) => [wo.contractId, wo]),
  );
  const workOrderByLeadId = new Map(
    workOrderByLeadRows
      .filter((wo): wo is typeof wo & { leadId: string } => Boolean(wo.leadId))
      .map((wo) => [wo.leadId, wo]),
  );
  const workOrderIds = [
    ...new Set([
      ...workOrderByContractRows.map((wo) => wo.id),
      ...workOrderByLeadRows.map((wo) => wo.id),
    ]),
  ];
  const handoverRows =
    workOrderIds.length > 0
      ? await db.query.handovers.findMany({
          where: inArray(handovers.workOrderId, workOrderIds),
          columns: {
            id: true,
            code: true,
            status: true,
            workOrderId: true,
          },
        })
      : [];
  const handoverByWorkOrderId = new Map(
    handoverRows.map((handover) => [handover.workOrderId, handover]),
  );

  const warrantyRows =
    uniqueIds.length > 0
      ? await db.query.warrantyTickets.findMany({
          where: inArray(warrantyTickets.leadId, uniqueIds),
          columns: {
            id: true,
            code: true,
            leadId: true,
            status: true,
            priority: true,
            issueTitle: true,
            reportedAt: true,
          },
          orderBy: [desc(warrantyTickets.reportedAt)],
        })
      : [];
  const warrantyByLeadId = new Map<string, typeof warrantyRows>();
  for (const row of warrantyRows) {
    if (!row.leadId) continue;
    const list = warrantyByLeadId.get(row.leadId) ?? [];
    list.push(row);
    warrantyByLeadId.set(row.leadId, list);
  }

  const latestEditRows =
    quotationIds.length > 0
      ? await db
          .select({
            quotationId: quotationEditLogs.quotationId,
            latestEditAt: sql<Date>`max(${quotationEditLogs.editedAt})`.as(
              'latest_edit_at',
            ),
          })
          .from(quotationEditLogs)
          .where(inArray(quotationEditLogs.quotationId, quotationIds))
          .groupBy(quotationEditLogs.quotationId)
      : [];

  const latestEditByQuotation = new Map(
    latestEditRows.map((r) => [r.quotationId, new Date(r.latestEditAt)]),
  );

  const userIds = new Set<string>();
  for (const lead of leadRows) {
    if (lead.assignedTo) userIds.add(lead.assignedTo);
  }
  for (const survey of surveyByLeadId.values()) {
    if (survey.assignedTo) userIds.add(survey.assignedTo);
  }

  const userRows =
    userIds.size > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, [...userIds]),
          columns: { id: true, name: true },
        })
      : [];
  const userNames = new Map(userRows.map((u) => [u.id, u.name]));

  for (const lead of leadRows) {
    const surveyRow = surveyByLeadId.get(lead.id);
    const quotationRow = surveyRow ? quotationBySurveyId.get(surveyRow.id) : undefined;

    const records: ProjectContext['records'] = {
      lead: buildRecordRef({
        module: 'lead',
        entityId: lead.id,
        code: lead.code,
        status: lead.status,
        statusLabel: getLeadStatusLabel(lead.status),
        detail: lead.fullName,
      }),
      survey: null,
      quotation: null,
      contract: null,
      work_order: null,
      installation: null,
      handover: null,
      warranty: null,
      bom: null,
      inventory: null,
      payment: null,
    };

    if (surveyRow) {
      records.survey = buildRecordRef({
        module: 'survey',
        entityId: surveyRow.id,
        code: surveyRow.code,
        status: surveyRow.status,
        statusLabel:
          SURVEY_STATUS_LABELS[surveyRow.status as SurveyStatus] ?? surveyRow.status,
      });
    }

    if (quotationRow) {
      const latestEditAt = latestEditByQuotation.get(quotationRow.id) ?? null;
      const needsResend = computeNeedsResend({
        status: quotationRow.status as QuotationStatus,
        sentAt: quotationRow.sentAt,
        latestEditAt,
      });
      records.quotation = buildRecordRef({
        module: 'quotation',
        entityId: quotationRow.id,
        code: quotationRow.code,
        status: quotationRow.status,
        statusLabel:
          QUOTATION_STATUS_LABELS[quotationRow.status as QuotationStatus] ??
          quotationRow.status,
        detail: formatQuotationDetail(
          quotationRow.revisionNumber,
          quotationRow.grandTotal,
        ),
        meta: { needsResend, revisionNumber: quotationRow.revisionNumber },
      });

      const contractRow = contractByQuotationId.get(quotationRow.id);
      if (contractRow) {
        records.contract = buildRecordRef({
          module: 'contract',
          entityId: contractRow.id,
          code: contractRow.code,
          status: contractRow.status,
          statusLabel:
            CONTRACT_STATUS_LABELS[contractRow.status as ContractStatus] ??
            contractRow.status,
          detail: formatContractDetail(contractRow.contractValue),
        });

        const workOrderRow =
          workOrderByContractId.get(contractRow.id) ?? workOrderByLeadId.get(lead.id);
        if (workOrderRow) {
          attachWorkOrderAndHandover(records, workOrderRow, handoverByWorkOrderId);
        }
      }
    }

    if (!records.work_order) {
      const workOrderRow = workOrderByLeadId.get(lead.id);
      if (workOrderRow) {
        attachWorkOrderAndHandover(records, workOrderRow, handoverByWorkOrderId);
      }
    }

    const leadWarrantyTickets = warrantyByLeadId.get(lead.id) ?? [];
    const drivingWarranty = pickDrivingWarrantyTicket(leadWarrantyTickets);
    if (drivingWarranty) {
      records.warranty = buildRecordRef({
        module: 'warranty',
        entityId: drivingWarranty.id,
        code: drivingWarranty.code,
        status: drivingWarranty.status,
        statusLabel:
          WARRANTY_TICKET_STATUS_LABELS[drivingWarranty.status as WarrantyTicketStatus] ??
          drivingWarranty.status,
        detail: drivingWarranty.issueTitle,
        meta: { priority: drivingWarranty.priority },
      });
    }

    contextMap.set(lead.id, {
      anchor: { module: 'lead', entityId: lead.id },
      records,
      responsible: resolveResponsible(
        lead.assignedTo,
        surveyRow?.assignedTo ?? null,
        userNames,
      ),
    });
  }

  return contextMap;
}
