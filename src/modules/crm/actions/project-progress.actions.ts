'use server';

import { auth } from '@/auth';
import {
  queryProjectProgressForLead,
  queryProjectProgressForLeads,
} from '@/lib/project-progress/query-project-progress';
import type { ProjectProgressView } from '@/lib/project-progress/types';
import { modulePerfLog, modulePerfLogError, modulePerfTimed } from '@/lib/server/module-list-log';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function getProjectProgressForLeadAction(
  leadId: string,
): Promise<ActionResult<ProjectProgressView | null>> {
  const started = performance.now();
  try {
    await modulePerfTimed('project-progress-lead', 'auth', () => getSessionOrThrow());
    const data = await modulePerfTimed('project-progress-lead', 'queryProgress', () =>
      queryProjectProgressForLead(leadId),
    );
    modulePerfLog('project-progress-lead', 'action ok', performance.now() - started, {
      count: data ? 1 : 0,
    });
    return { success: true, data };
  } catch (e) {
    modulePerfLogError('project-progress-lead', 'action failed', e, performance.now() - started);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getProjectProgressForLeadsAction(
  leadIds: string[],
): Promise<ActionResult<Record<string, ProjectProgressView>>> {
  const started = performance.now();
  try {
    await modulePerfTimed('project-progress-leads', 'auth', () => getSessionOrThrow());
    const map = await modulePerfTimed(
      'project-progress-leads',
      'queryProgressBatch',
      () => queryProjectProgressForLeads(leadIds),
      { requestedCount: leadIds.length },
    );
    modulePerfLog('project-progress-leads', 'action ok', performance.now() - started, {
      requestedCount: leadIds.length,
      count: map.size,
    });
    return { success: true, data: Object.fromEntries(map) };
  } catch (e) {
    modulePerfLogError('project-progress-leads', 'action failed', e, performance.now() - started);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
