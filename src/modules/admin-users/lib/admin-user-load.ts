import 'server-only';

import { adminUserFiltersSchema } from '../schema/admin-user.schema';
import { serializeAdminUserList } from './admin-user-serialize';
import { queryAdminUsers, queryAllRoles } from './admin-user.queries';

function devLog(message: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[admin-users] ${message}`, extra ?? '');
  }
}

function devLogError(message: string, error: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[admin-users] ${message}`, error);
  }
}

export async function loadAdminUsersList(filters: Record<string, unknown> = {}) {
  const started = Date.now();
  devLog('list query start', { filters });

  try {
    const parsed = adminUserFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const rows = await queryAdminUsers(parsed.data);
    const data = serializeAdminUserList(rows);
    devLog('list query ok', { ms: Date.now() - started, count: data.length });
    return { success: true as const, data };
  } catch (error) {
    devLogError('list query failed', error);
    return {
      success: false as const,
      error: 'Không thể tải danh sách tài khoản. Vui lòng thử lại.',
    };
  }
}

export async function loadAdminRolesList() {
  const started = Date.now();
  devLog('roles query start');

  try {
    const data = await queryAllRoles();
    devLog('roles query ok', { ms: Date.now() - started, count: data.length });
    return { success: true as const, data };
  } catch (error) {
    devLogError('roles query failed', error);
    return {
      success: false as const,
      error: 'Không thể tải danh sách vai trò. Vui lòng thử lại.',
    };
  }
}
