import type {
  ProjectStageDefinition,
  ProjectStageKey,
  StageResolver,
} from './types';

const stageDefs = new Map<ProjectStageKey, ProjectStageDefinition>();

export function defineStage(def: ProjectStageDefinition): ProjectStageDefinition {
  stageDefs.set(def.key, def);
  return def;
}

export function getStageDefinition(key: ProjectStageKey): ProjectStageDefinition {
  const def = stageDefs.get(key);
  if (!def) throw new Error(`Unknown project stage: ${key}`);
  return def;
}

const resolvers: StageResolver[] = [];

/** Register a resolver; earlier registration = higher priority. */
export function registerStageResolver(resolver: StageResolver): void {
  resolvers.push(resolver);
}

export function getStageResolvers(): readonly StageResolver[] {
  return resolvers;
}

/** Bootstrap built-in stage metadata (labels/orders). */
export function registerCoreStageDefinitions(): void {
  defineStage({ key: 'lead_no_survey', order: 10, label: 'Lead', module: 'lead' });
  defineStage({ key: 'lead_terminal', order: 11, label: 'Lead kết thúc', module: 'lead' });
  defineStage({ key: 'survey_cancelled', order: 25, label: 'Khảo sát đã hủy', module: 'survey' });
  defineStage({
    key: 'survey_in_progress',
    order: 20,
    label: 'Khảo sát đang thực hiện',
    module: 'survey',
  });
  defineStage({
    key: 'survey_awaiting_quotation',
    order: 30,
    label: 'Khảo sát hoàn thành - chờ báo giá',
    module: 'survey',
  });
  defineStage({ key: 'quotation_draft', order: 40, label: 'Đang lập báo giá', module: 'quotation' });
  defineStage({
    key: 'quotation_sent',
    order: 50,
    label: 'Báo giá đã gửi - chờ khách phản hồi',
    module: 'quotation',
  });
  defineStage({
    key: 'quotation_needs_resend',
    order: 55,
    label: 'Báo giá đã chỉnh sửa - cần gửi lại',
    module: 'quotation',
  });
  defineStage({
    key: 'quotation_accepted',
    order: 60,
    label: 'Khách đồng ý - chờ hợp đồng',
    module: 'quotation',
  });
  defineStage({
    key: 'quotation_rejected',
    order: 45,
    label: 'Khách từ chối báo giá',
    module: 'quotation',
  });
  defineStage({
    key: 'quotation_needs_revision',
    order: 46,
    label: 'Cần chỉnh báo giá',
    module: 'quotation',
  });
  defineStage({
    key: 'quotation_no_response',
    order: 48,
    label: 'Khách chưa phản hồi',
    module: 'quotation',
  });
  defineStage({
    key: 'quotation_expired',
    order: 49,
    label: 'Báo giá hết hiệu lực',
    module: 'quotation',
  });
}
