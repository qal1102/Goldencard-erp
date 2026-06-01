import 'server-only';

import { db } from '@/db';
import { auditLogs } from '@/db/schema';

export type CreateAuditLogInput = {
  userId: string | null;
  action: string;
  /** Module or resource type, e.g. `survey`, `quotation` */
  resource: string;
  resourceId?: string | null;
  summary?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

/**
 * Writes a row to the shared `audit_logs` table.
 * `summary` is stored in `new_data.summary`; before/after snapshots use `old_data` / `new_data`.
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  const { summary, before, after, ...rest } = input;

  await db.insert(auditLogs).values({
    userId: rest.userId,
    action: rest.action,
    resource: rest.resource,
    resourceId: rest.resourceId ?? null,
    oldData: before ?? null,
    newData:
      summary != null || after != null
        ? {
            ...(after ?? {}),
            ...(summary != null ? { summary } : {}),
          }
        : null,
    ipAddress: rest.ipAddress ?? null,
  });
}
