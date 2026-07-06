import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { ModuleGuide } from '@/components/ui/module-guide';
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
      <ModuleGuide
        className="mb-4"
        title="Hướng dẫn nhanh thi công"
        description="Lệnh thi công dùng để giao việc từ hợp đồng đã ký cho quản lý dự án, kỹ sư trưởng và đội kỹ thuật."
        steps={[
          'Tạo lệnh từ hợp đồng đã ký, không tạo rời khỏi quy trình.',
          'Phân công người phụ trách chính và nhân sự tham gia.',
          'Lập vật tư dự trù, giữ vật tư trong kho nếu cần chuẩn bị trước cho đội thi công.',
          'Khi hoàn thành, chuyển sang bàn giao để xác nhận với khách.',
        ]}
        note={isTechnician ? 'Bạn chỉ thấy các lệnh liên quan tới mình.' : 'Quản lý nên cập nhật người phụ trách rõ để mọi người biết ai chịu trách nhiệm chính.'}
      />

      <WorkOrderList
        isTechnician={isTechnician}
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
