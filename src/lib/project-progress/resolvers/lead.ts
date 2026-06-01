import { getLeadStatusLabel } from '@/modules/crm/lib/lead-labels';
import { getStageDefinition } from '../registry';
import type { ProjectContext, ProjectStageResolution } from '../types';

export function resolveLeadStage(ctx: ProjectContext): ProjectStageResolution | null {
  const lead = ctx.records.lead;
  if (!lead) return null;

  if (ctx.records.survey) return null;

  const status = lead.status;

  if (status === 'lost') {
    const stage = getStageDefinition('lead_terminal');
    return {
      stage,
      dashboardStatus: 'lead_terminal',
      currentStageLabel: getLeadStatusLabel(status),
      nextAction: 'Không có hành động tiếp theo',
      primaryModule: 'lead',
      responsible: ctx.responsible,
    };
  }

  if (status === 'won') {
    const stage = getStageDefinition('lead_terminal');
    return {
      stage,
      dashboardStatus: 'lead_terminal',
      currentStageLabel: getLeadStatusLabel(status),
      nextAction: 'Tạo phiếu khảo sát từ khách hàng (nếu cần)',
      primaryModule: 'lead',
      responsible: ctx.responsible,
    };
  }

  const stage = getStageDefinition('lead_no_survey');
  return {
    stage,
    dashboardStatus: 'lead_no_survey',
    currentStageLabel: getLeadStatusLabel(status),
    nextAction: 'Tạo phiếu khảo sát',
    primaryModule: 'lead',
    responsible: ctx.responsible,
  };
}
