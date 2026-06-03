import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { WorkOrderList } from '@/modules/work-orders/components/work-order-list';

export default async function WorkOrdersPage() {
  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (
    !hasRole(
      roles,
      'admin',
      'director',
      'sales',
      'chief_accountant',
      'accountant',
      'technician',
    )
  ) {
    return null;
  }

  const isTechnician =
    hasRole(roles, 'technician') &&
    !hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant', 'accountant');

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Lệnh thi công</h1>
        <p className="text-xs text-muted-foreground">
          {isTechnician
            ? 'Danh sách lệnh được phân công cho bạn'
            : 'Danh sách lệnh thi công từ hợp đồng đã ký'}
        </p>
      </div>
      <WorkOrderList isTechnician={isTechnician} />
    </div>
  );
}
