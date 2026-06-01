'use server';

import { auth } from '@/auth';
import {
  queryProjectProgressForLead,
  queryProjectProgressForLeads,
} from '@/lib/project-progress/query-project-progress';
import type { ProjectProgressView } from '@/lib/project-progress/types';

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
  try {
    await getSessionOrThrow();
    const data = await queryProjectProgressForLead(leadId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getProjectProgressForLeadsAction(
  leadIds: string[],
): Promise<ActionResult<Record<string, ProjectProgressView>>> {
  try {
    await getSessionOrThrow();
    const map = await queryProjectProgressForLeads(leadIds);
    return { success: true, data: Object.fromEntries(map) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
