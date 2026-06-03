import { registerCoreStageDefinitions, registerStageResolver } from '../registry';
import { resolveContractStage } from './contract';
import { resolveHandoverStage } from './handover';
import { resolveWorkOrderStage } from './work-order';
import { resolveLeadStage } from './lead';
import { resolveQuotationStage } from './quotation';
import { resolveSurveyStage } from './survey';

let bootstrapped = false;

/**
 * Registers built-in stage definitions and resolvers (CRM → Survey → Quotation).
 * Future modules add resolvers here or via registerStageResolver() from their package.
 */
export function ensureProjectProgressRegistry(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  registerCoreStageDefinitions();

  /**
   * Highest priority first — furthest downstream linked record is the source of truth:
   * Handover > WorkOrder > Contract > Quotation > Survey > Lead (manual sales status only when alone).
   */
  registerStageResolver(resolveHandoverStage);
  registerStageResolver(resolveWorkOrderStage);
  registerStageResolver(resolveContractStage);
  registerStageResolver(resolveQuotationStage);
  registerStageResolver(resolveSurveyStage);
  registerStageResolver(resolveLeadStage);
}
