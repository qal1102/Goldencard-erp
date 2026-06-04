import { requireSuperAdminPage } from '@/lib/auth/super-admin';
import { AdminUserDetail } from '@/modules/admin-users/components/admin-user-detail';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  await requireSuperAdminPage();
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-xl">
      <AdminUserDetail userId={id} />
    </div>
  );
}
