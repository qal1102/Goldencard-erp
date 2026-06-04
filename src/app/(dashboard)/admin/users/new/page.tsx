import { requireSuperAdminPage } from '@/lib/auth/super-admin';
import { AdminUserCreateForm } from '@/modules/admin-users/components/admin-user-create-form';

export default async function AdminUserNewPage() {
  await requireSuperAdminPage();

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Tạo tài khoản</h1>
        <p className="text-xs text-muted-foreground">
          Thêm nhân viên mới và gán vai trò
        </p>
      </div>
      <AdminUserCreateForm />
    </div>
  );
}
