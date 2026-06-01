import 'server-only';

import { desc, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { leads, quotationEditLogs, quotations, surveys, users } from '@/db/schema';
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
import { buildRecordRef } from '../modules';
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
      roleLabel: 'Phụ trách lead',
    };
  }
  return null;
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
