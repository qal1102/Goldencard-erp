import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { WorkOrderList } from '@/modules/work-orders/components/work-order-list';
import { loadWorkOrdersList } from '@/modules/work-orders/lib/work-order-load';

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'project_manager',
  'chief_engineer',
  'chief_accountant',
  'accountant',
  'technician',
] as const;

export default async function WorkOrdersPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];

  if (!hasRole(roles, ...VIEW_ROLES)) {
    return <AccessDeniedMessage moduleName="lệnh thi công" />;
  }

  const isTechnician =
    hasRole(roles, 'technician') &&
    !hasRole(
      roles,
      'admin',
      'director',
      'project_manager',
      'chief_engineer',
      'chief_accountant',
      'accountant',
    );

  const loadResult = await loadWorkOrdersList(
    {},
    { userId: session.user.id, roles },
  );

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
      <WorkOrderList
        isTechnician={isTechnician}
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
