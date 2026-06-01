import { splitUpstreamDownstream } from './modules';
import { getStageResolvers } from './registry';
import type {
  ProjectContext,
  ProjectProgressView,
  ProjectStageResolution,
  ProjectResponsible,
} from './types';

function pickResponsible(
  ctx: ProjectContext,
  resolution: ProjectStageResolution,
): ProjectResponsible | null {
  return resolution.responsible ?? ctx.responsible ?? null;
}

/**
 * Derives the canonical progress view from a loaded context.
 * Add new stages by registering resolvers — do not fork this function per module.
 */
export function composeProjectProgressView(ctx: ProjectContext): ProjectProgressView {
  let resolution: ProjectStageResolution | null = null;

  for (const resolver of getStageResolvers()) {
    resolution = resolver(ctx);
    if (resolution) break;
  }

  if (!resolution) {
    throw new Error(
      `No project stage resolver matched anchor ${ctx.anchor.module}:${ctx.anchor.entityId}`,
    );
  }

  const { upstream, downstream } = splitUpstreamDownstream(
    ctx.records,
    resolution.primaryModule,
  );

  const responsible = pickResponsible(ctx, resolution);

  return {
    anchor: ctx.anchor,
    dashboardStatus: resolution.dashboardStatus,
    stage: resolution.stage,
    currentStageLabel: resolution.currentStageLabel,
    nextAction: resolution.nextAction,
    primaryModule: resolution.primaryModule,
    upstream,
    downstream,
    records: ctx.records,
    responsible,
  };
}
