import 'server-only';

import { composeProjectProgressView } from './compose';
import { loadProjectContextForLeadAnchors } from './providers/lead-anchor';
import { ensureProjectProgressRegistry } from './resolvers';
import type { ProjectProgressView } from './types';

ensureProjectProgressRegistry();

export async function queryProjectProgressForLeads(
  leadIds: string[],
): Promise<Map<string, ProjectProgressView>> {
  const contexts = await loadProjectContextForLeadAnchors(leadIds);
  const progressMap = new Map<string, ProjectProgressView>();

  for (const [leadId, ctx] of contexts) {
    progressMap.set(leadId, composeProjectProgressView(ctx));
  }

  return progressMap;
}

export async function queryProjectProgressForLead(
  leadId: string,
): Promise<ProjectProgressView | null> {
  const map = await queryProjectProgressForLeads([leadId]);
  return map.get(leadId) ?? null;
}
