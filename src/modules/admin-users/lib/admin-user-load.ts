import 'server-only';

import { modulePerfLog, modulePerfLogError } from '@/lib/server/module-list-log';
import { adminUserFiltersSchema } from '../schema/admin-user.schema';
import { serializeAdminUserList } from './admin-user-serialize';
import { queryAdminUsers, queryAllRoles } from './admin-user.queries';

export async function loadAdminUsersList(filters: Record<string, unknown> = {}) {
  const started = performance.now();
  modulePerfLog('admin-users', 'list query start', 0, {
    hasFilters: Object.keys(filters).length > 0,
  });

  try {
    const parsed = adminUserFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const rows = await queryAdminUsers(parsed.data);
    const data = serializeAdminUserList(rows);
    modulePerfLog('admin-users', 'list query ok', performance.now() - started, {
      count: data.length,
    });
    return { success: true as const, data };
  } catch (error) {
    modulePerfLogError('admin-users', 'list query failed', error, performance.now() - started);
    return {
      success: false as const,
      error: 'Không thể tải danh sách tài khoản. Vui lòng thử lại.',
    };
  }
}

export async function loadAdminRolesList() {
  const started = performance.now();
  modulePerfLog('admin-users', 'roles query start');

  try {
    const data = await queryAllRoles();
    modulePerfLog('admin-users', 'roles query ok', performance.now() - started, {
      count: data.length,
    });
    return { success: true as const, data };
  } catch (error) {
    modulePerfLogError('admin-users', 'roles query failed', error, performance.now() - started);
    return {
      success: false as const,
      error: 'Không thể tải danh sách vai trò. Vui lòng thử lại.',
    };
  }
}
