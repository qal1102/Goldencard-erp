import { getStageDefinition } from '../registry';
import type { ProjectContext, ProjectStageResolution } from '../types';

export function resolveSurveyStage(ctx: ProjectContext): ProjectStageResolution | null {
  const surveyRef = ctx.records.survey;
  if (!surveyRef) return null;

  if (surveyRef.status === 'cancelled') {
    const stage = getStageDefinition('survey_cancelled');
    return {
      stage,
      dashboardStatus: 'survey_cancelled',
      currentStageLabel: stage.label,
      nextAction: 'Tạo phiếu khảo sát mới',
      primaryModule: 'survey',
    };
  }

  if (ctx.records.quotation) return null;

  if (surveyRef.status === 'pending' || surveyRef.status === 'assigned') {
    const stage = getStageDefinition('survey_in_progress');
    return {
      stage,
      dashboardStatus: 'survey_in_progress',
      currentStageLabel: stage.label,
      nextAction:
        surveyRef.status === 'pending' ? 'Phân công kỹ thuật viên' : 'Hoàn thành khảo sát',
      primaryModule: 'survey',
      responsible: ctx.responsible,
    };
  }

  if (surveyRef.status === 'completed') {
    const stage = getStageDefinition('survey_awaiting_quotation');
    return {
      stage,
      dashboardStatus: 'survey_awaiting_quotation',
      currentStageLabel: stage.label,
      nextAction: 'Tạo báo giá',
      primaryModule: 'survey',
    };
  }

  return null;
}
