import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { QuotationList } from '@/modules/quotations/components/quotation-list';

export default async function QuotationsPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant', 'accountant')) {
    redirect('/dashboard');
  }

  const canWrite = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Báo giá</h1>
          <p className="text-xs text-muted-foreground">Danh sách tất cả báo giá</p>
        </div>
        {canWrite && (
          <p className="text-xs text-muted-foreground">
            Tạo từ trang Khảo sát
          </p>
        )}
      </div>

      <QuotationList />
    </div>
  );
}
