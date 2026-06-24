import 'server-only';

import { hasRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLog, devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import { workOrderFiltersSchema, type WorkOrderFilters } from '../schema/work-order.schema';
import { queryWorkOrders } from './work-order.queries';

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'project_manager',
  'chief_engineer',
  'chief_accountant',
  'accountant',
  'technician',
] as const;

export async function loadWorkOrdersList(
  filters: WorkOrderFilters = {},
  options: { userId: string; roles: string[] },
) {
  const started = Date.now();
  devModuleLog('work-orders', 'list query start', { filters });

  try {
    if (!hasRole(options.roles, ...VIEW_ROLES)) {
      return { success: false as const, error: 'Bạn không có quyền xem lệnh thi công.' };
    }

    const parsed = workOrderFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const effectiveFilters = { ...parsed.data };
    const isTechnicianOnly =
      hasRole(options.roles, 'technician') &&
      !hasRole(
        options.roles,
        'admin',
        'director',
        'project_manager',
        'chief_engineer',
        'chief_accountant',
        'accountant',
      );

    if (isTechnicianOnly) {
      effectiveFilters.assignedTo = options.userId;
    }

    const data = serializeForClient(await queryWorkOrders(effectiveFilters));
    devModuleLog('work-orders', 'list query ok', { ms: Date.now() - started, count: data.length });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('work-orders', 'list query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}
