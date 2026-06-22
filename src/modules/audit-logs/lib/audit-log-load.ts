import 'server-only';

import { auditLogFiltersSchema, type AuditLogFilters } from '../schema/audit-log.schema';
import { queryAuditLogFilterOptions, queryAuditLogs } from './audit-log.queries';

export type SerializedAuditLogRow = Omit<
  Awaited<ReturnType<typeof queryAuditLogs>>[number],
  'createdAt'
> & {
  createdAt: string;
};

export type SerializedAuditLogFilterOptions = Awaited<
  ReturnType<typeof queryAuditLogFilterOptions>
>;

export type LoadAuditLogsResult =
  | {
      success: true;
      data: SerializedAuditLogRow[];
      options: SerializedAuditLogFilterOptions;
      filters: AuditLogFilters;
    }
  | { success: false; error: string; options: SerializedAuditLogFilterOptions };

const emptyOptions: SerializedAuditLogFilterOptions = {
  actors: [],
  resources: [],
  actions: [],
};

function normalizeFilters(input: AuditLogFilters): AuditLogFilters {
  return {
    q: input.q || undefined,
    userId: input.userId || undefined,
    resource: input.resource || undefined,
    action: input.action || undefined,
    from: input.from || undefined,
    to: input.to || undefined,
  };
}

export async function loadAuditLogs(
  rawFilters: AuditLogFilters = {},
): Promise<LoadAuditLogsResult> {
  let options = emptyOptions;

  try {
    options = await queryAuditLogFilterOptions();
    const parsed = auditLogFiltersSchema.safeParse(rawFilters);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Bộ lọc nhật ký không hợp lệ.',
        options,
      };
    }

    const filters = normalizeFilters(parsed.data);
    const rows = await queryAuditLogs(filters);
    return {
      success: true,
      data: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      options,
      filters,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[audit] loadAuditLogs failed', error);
    }
    return {
      success: false,
      error: 'Không thể tải nhật ký hoạt động. Vui lòng thử lại.',
      options,
    };
  }
}
