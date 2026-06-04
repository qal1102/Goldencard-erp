import { requireSuperAdminPage } from '@/lib/auth/super-admin';
import { AdminUserList } from '@/modules/admin-users/components/admin-user-list';
import { loadAdminRolesList, loadAdminUsersList } from '@/modules/admin-users/lib/admin-user-load';

export default async function AdminUsersPage() {
  await requireSuperAdminPage();

  const [usersResult, rolesResult] = await Promise.all([
    loadAdminUsersList({}),
    loadAdminRolesList(),
  ]);

  const initialError =
    !usersResult.success
      ? usersResult.error
      : !rolesResult.success
        ? rolesResult.error
        : null;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Quản lý tài khoản</h1>
        <p className="text-xs text-muted-foreground">
          Tạo và quản lý tài khoản nhân viên ERP (chỉ Super Admin)
        </p>
      </div>
      <AdminUserList
        initialUsers={usersResult.success ? usersResult.data : undefined}
        initialRoles={rolesResult.success ? rolesResult.data : undefined}
        initialError={initialError}
      />
    </div>
  );
}
