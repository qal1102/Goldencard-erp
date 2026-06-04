import 'server-only';

import { hasRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLog, devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import {
  warrantyTicketFiltersSchema,
  type WarrantyTicketFilters,
} from '../schema/warranty-ticket.schema';
import { queryWarrantyTickets } from './warranty-ticket.queries';

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

export async function loadWarrantyTicketsList(
  filters: WarrantyTicketFilters = {},
  roles: string[] = [],
) {
  const started = Date.now();
  devModuleLog('warranty', 'list query start', { filters });

  try {
    if (!hasRole(roles, ...VIEW_ROLES)) {
      return { success: false as const, error: 'Bạn không có quyền xem yêu cầu bảo hành/CSKH.' };
    }

    const parsed = warrantyTicketFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeForClient(await queryWarrantyTickets(parsed.data));
    devModuleLog('warranty', 'list query ok', { ms: Date.now() - started, count: data.length });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('warranty', 'list query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}
