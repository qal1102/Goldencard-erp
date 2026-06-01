import { registerCoreStageDefinitions, registerStageResolver } from '../registry';
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

  // Highest priority first: downstream modules override upstream.
  registerStageResolver(resolveQuotationStage);
  registerStageResolver(resolveSurveyStage);
  registerStageResolver(resolveLeadStage);
}
