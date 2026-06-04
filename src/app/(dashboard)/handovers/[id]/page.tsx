import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { HandoverDetail } from '@/modules/handovers/components/handover-detail';
import { queryHandoverById } from '@/modules/handovers/lib/handover.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function HandoverDetailPage({ params }: Props) {
  const { id } = await params;

  const [session, handover] = await Promise.all([auth(), queryHandoverById(id)]);
  if (!handover) notFound();

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
    notFound();
  }

  const canWrite = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');
  const canCreateWarranty = hasRole(
    roles,
    'admin',
    'director',
    'sales',
    'chief_accountant',
    'customer_service',
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <HandoverDetail
        key={id}
        handoverId={id}
        canWrite={canWrite}
        canCreateWarranty={canCreateWarranty}
      />
    </div>
  );
}
