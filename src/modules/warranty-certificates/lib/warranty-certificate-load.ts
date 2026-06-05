import 'server-only';

import { hasRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLog, devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import {
  warrantyCertificateFiltersSchema,
  type WarrantyCertificateFilters,
} from '../schema/warranty-certificate.schema';
import { queryWarrantyCertificates } from './warranty-certificate.queries';

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

export async function loadWarrantyCertificatesList(
  filters: WarrantyCertificateFilters = {},
  roles: string[] = [],
) {
  const started = Date.now();
  devModuleLog('warranty-certificates', 'list query start', { filters });

  try {
    if (!hasRole(roles, ...VIEW_ROLES)) {
      return { success: false as const, error: 'Bạn không có quyền xem phiếu bảo hành.' };
    }

    const parsed = warrantyCertificateFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeForClient(await queryWarrantyCertificates(parsed.data));
    devModuleLog('warranty-certificates', 'list query ok', {
      ms: Date.now() - started,
      count: data.length,
    });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('warranty-certificates', 'list query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}
