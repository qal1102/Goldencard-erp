import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { queryWorkOrderById } from '@/modules/work-orders/lib/work-order.queries';
import { WorkOrderDetail } from '@/modules/work-orders/components/work-order-detail';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorkOrderDetailPage({ params }: Props) {
  const { id } = await params;

  const [session, workOrder] = await Promise.all([auth(), queryWorkOrderById(id)]);
  if (!workOrder) notFound();

  const roles = session?.user?.roles ?? [];
  if (
    !hasRole(
      roles,
      'admin',
      'director',
      'sales',
      'project_manager',
      'chief_engineer',
      'chief_accountant',
      'accountant',
      'technician',
    )
  ) {
    notFound();
  }

  const isTechnicianOnly =
    hasRole(roles, 'technician') &&
    !hasRole(
      roles,
      'admin',
      'director',
      'sales',
      'project_manager',
      'chief_engineer',
      'chief_accountant',
      'accountant',
    );
  if (isTechnicianOnly && workOrder.assignedTo !== session?.user?.id) {
    notFound();
  }

  const canWrite = hasRole(
    roles,
    'admin',
    'director',
    'sales',
    'project_manager',
    'chief_engineer',
    'chief_accountant',
  );
  const canManageMaterials = hasRole(
    roles,
    'admin',
    'director',
    'project_manager',
    'chief_engineer',
    'chief_accountant',
    'accountant',
    'technician',
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <WorkOrderDetail
        key={id}
        workOrderId={id}
        canWrite={canWrite}
        canManageMaterials={canManageMaterials}
      />
    </div>
  );
}
