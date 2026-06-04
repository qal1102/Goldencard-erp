import type { AdminUserListRow } from './admin-user.queries';

export type SerializedAdminUserListRow = Omit<
  AdminUserListRow,
  'createdAt' | 'lastLoginAt'
> & {
  createdAt: string;
  lastLoginAt: string | null;
};

export function serializeAdminUserList(rows: AdminUserListRow[]): SerializedAdminUserListRow[] {
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    lastLoginAt:
      row.lastLoginAt == null
        ? null
        : row.lastLoginAt instanceof Date
          ? row.lastLoginAt.toISOString()
          : String(row.lastLoginAt),
  }));
}
