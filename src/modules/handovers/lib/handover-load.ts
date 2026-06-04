import 'server-only';

import { hasRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLog, devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import { handoverFiltersSchema, type HandoverFilters } from '../schema/handover.schema';
import { queryHandovers } from './handover.queries';

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
] as const;

export async function loadHandoversList(
  filters: HandoverFilters = {},
  roles: string[] = [],
) {
  const started = Date.now();
  devModuleLog('handovers', 'list query start', { filters });

  try {
    if (!hasRole(roles, ...VIEW_ROLES)) {
      return { success: false as const, error: 'Bạn không có quyền xem phiếu bàn giao.' };
    }

    const parsed = handoverFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeForClient(await queryHandovers(parsed.data));
    devModuleLog('handovers', 'list query ok', { ms: Date.now() - started, count: data.length });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('handovers', 'list query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}
