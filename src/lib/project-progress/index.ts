/**
 * ERP project-progress backbone.
 *
 * Extend by:
 * 1. defineStage() + registerStageResolver() in registry (or module-specific resolver file)
 * 2. loadProjectContextFor* provider for new anchors
 * 3. composeProjectProgressView() — unchanged
 * 4. ProjectProgressPanel in UI
 */

export { composeProjectProgressView } from './compose';
export {
  PROJECT_DELIVERY_PIPELINE,
  PROJECT_MODULE_CONFIG,
  buildRecordRef,
  splitUpstreamDownstream,
} from './modules';
export {
  defineStage,
  getStageDefinition,
  registerCoreStageDefinitions,
  registerStageResolver,
} from './registry';
export { ensureProjectProgressRegistry } from './resolvers';
export { loadProjectContextForLeadAnchors } from './providers/lead-anchor';
export {
  queryProjectProgressForLead,
  queryProjectProgressForLeads,
} from './query-project-progress';
export { ProjectProgressPanel } from './ui/project-progress-panel';
export {
  PROJECT_MODULE_KEYS,
  PROJECT_STAGE_KEYS,
  getProgressRecord,
  type ProjectAnchor,
  type ProjectContext,
  type ProjectModuleKey,
  type ProjectProgress,
  type ProjectProgressView,
  type ProjectRecordRef,
  type ProjectRecords,
  type ProjectResponsible,
  type ProjectStageDefinition,
  type ProjectStageKey,
  type ProjectStageResolution,
  type StageResolver,
} from './types';
