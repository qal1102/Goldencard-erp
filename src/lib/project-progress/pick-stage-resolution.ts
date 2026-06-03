import { getStageResolvers } from './registry';
import type { ProjectContext, ProjectStageResolution } from './types';

/**
 * Picks the active project stage from loaded context.
 *
 * Resolver priority (first match wins — furthest downstream module wins):
 * 1. work_order → 2. contract → 3. quotation → 4. survey → 5. lead
 *
 * Keep this order in sync with `ensureProjectProgressRegistry()` in resolvers/index.ts.
 */
export function pickProjectStageResolution(
  ctx: ProjectContext,
): ProjectStageResolution | null {
  for (const resolver of getStageResolvers()) {
    const resolution = resolver(ctx);
    if (resolution) return resolution;
  }
  return null;
}
