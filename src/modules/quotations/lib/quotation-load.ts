import 'server-only';

import { hasRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLog, devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import { quotationFiltersSchema, type QuotationFilters } from '../schema/quotation.schema';
import { queryQuotations } from './quotation.queries';

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
] as const;

export async function loadQuotationsList(
  filters: QuotationFilters = {},
  roles: string[] = [],
) {
  const started = Date.now();
  devModuleLog('quotations', 'list query start', { filters });

  try {
    if (!hasRole(roles, ...VIEW_ROLES)) {
      return { success: false as const, error: 'Bạn không có quyền xem báo giá.' };
    }

    const parsed = quotationFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeForClient(await queryQuotations(parsed.data));
    devModuleLog('quotations', 'list query ok', { ms: Date.now() - started, count: data.length });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('quotations', 'list query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}
