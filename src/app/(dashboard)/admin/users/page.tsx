import { requireSuperAdminPage } from '@/lib/auth/super-admin';
import { AdminUserList } from '@/modules/admin-users/components/admin-user-list';

export default async function AdminUsersPage() {
  await requireSuperAdminPage();

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Quản lý tài khoản</h1>
        <p className="text-xs text-muted-foreground">
          Tạo và quản lý tài khoản nhân viên ERP (chỉ Super Admin)
        </p>
      </div>
      <AdminUserList />
    </div>
  );
}
