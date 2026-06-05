import 'server-only';

import { hasRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLog, devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import { contractFiltersSchema, type ContractFilters } from '../schema/contract.schema';
import { queryContracts } from './contract.queries';

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
] as const;

export async function loadContractsList(
  filters: ContractFilters = {},
  roles: string[] = [],
) {
  const started = Date.now();
  devModuleLog('contracts', 'list query start', { filters });

  try {
    if (!hasRole(roles, ...VIEW_ROLES)) {
      return { success: false as const, error: 'Bạn không có quyền xem hợp đồng.' };
    }

    const parsed = contractFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeForClient(await queryContracts(parsed.data));
    devModuleLog('contracts', 'list query ok', { ms: Date.now() - started, count: data.length });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('contracts', 'list query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}
