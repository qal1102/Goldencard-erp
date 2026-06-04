/**
 * Shared ERP project-progress backbone.
 * Modules register stage resolvers and context providers; UIs consume ProjectProgressView.
 */

/** All ERP modules that can participate in the project chain (extend as features ship). */
export const PROJECT_MODULE_KEYS = [
  'lead',
  'survey',
  'quotation',
  'contract',
  'work_order',
  'installation',
  'handover',
  'warranty',
  'bom',
  'inventory',
  'payment',
] as const;

export type ProjectModuleKey = (typeof PROJECT_MODULE_KEYS)[number];

/** Stable stage keys for dashboards, filters, and analytics. */
export const PROJECT_STAGE_KEYS = [
  'lead_no_survey',
  'lead_terminal',
  'survey_cancelled',
  'survey_in_progress',
  'survey_awaiting_quotation',
  'quotation_draft',
  'quotation_sent',
  'quotation_needs_resend',
  'quotation_accepted',
  'quotation_rejected',
  'quotation_needs_revision',
  'quotation_no_response',
  'quotation_expired',
  // Reserved — wired when modules ship
  'contract_draft',
  'contract_active',
  'work_order_created',
  'work_order_in_progress',
  'work_order_completed',
  'work_order_cancelled',
  'work_order_planned',
  'installation_in_progress',
  'handover_pending',
  'handover_completed',
  'handover_cancelled',
  'warranty_in_progress',
  'warranty_resolved',
] as const;

export type ProjectStageKey = (typeof PROJECT_STAGE_KEYS)[number];

export type ProjectAnchor = {
  module: ProjectModuleKey;
  entityId: string;
};

/** A single linked entity in the project chain. */
export type ProjectRecordRef = {
  module: ProjectModuleKey;
  entityId: string;
  code: string;
  status: string;
  statusLabel: string;
  href: string;
  /** Human module title, e.g. "Phiếu khảo sát" */
  title: string;
  detail?: string | null;
  meta?: Record<string, unknown>;
};

export type ProjectRecords = Partial<Record<ProjectModuleKey, ProjectRecordRef | null>>;

export type ProjectResponsible = {
  userId?: string | null;
  name?: string | null;
  role?: string | null;
  roleLabel?: string | null;
};

export type ProjectStageDefinition = {
  key: ProjectStageKey;
  /** Sort order on dashboards / pipeline (lower = earlier). */
  order: number;
  label: string;
  /** Primary ERP module driving this stage. */
  module: ProjectModuleKey;
};

/** Loaded facts for one anchor (e.g. a lead); resolvers derive stage from this. */
export type ProjectContext = {
  anchor: ProjectAnchor;
  records: ProjectRecords;
  responsible: ProjectResponsible | null;
};

export type ProjectStageResolution = {
  stage: ProjectStageDefinition;
  currentStageLabel: string;
  nextAction: string;
  dashboardStatus: ProjectStageKey;
  primaryModule: ProjectModuleKey;
  responsible?: ProjectResponsible | null;
};

export type StageResolver = (ctx: ProjectContext) => ProjectStageResolution | null;

/**
 * Canonical view for any screen (CRM, Survey, Contract, Dashboard).
 */
export type ProjectProgressView = {
  anchor: ProjectAnchor;
  dashboardStatus: ProjectStageKey;
  stage: ProjectStageDefinition;
  currentStageLabel: string;
  nextAction: string;
  primaryModule: ProjectModuleKey;
  upstream: ProjectRecordRef[];
  downstream: ProjectRecordRef[];
  records: ProjectRecords;
  responsible: ProjectResponsible | null;
};

/** @alias ProjectProgressView — preferred name going forward */
export type ProjectProgress = ProjectProgressView;

export function getProgressRecord(
  view: ProjectProgressView,
  module: ProjectModuleKey,
): ProjectRecordRef | null {
  return view.records[module] ?? null;
}
