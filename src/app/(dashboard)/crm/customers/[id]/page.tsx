import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { CustomerDetail } from '@/modules/crm/components/customer-detail';
import { queryCustomerById } from '@/modules/crm/lib/customer.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;

  const [session, customer] = await Promise.all([auth(), queryCustomerById(id)]);
  if (!customer) notFound();

  const roles = session?.user?.roles ?? [];
  const canManageSurvey = hasRole(roles, 'admin', 'director', 'sales');

  return (
    <div className="mx-auto w-full max-w-xl">
      <CustomerDetail customerId={id} canManageSurvey={canManageSurvey} />
    </div>
  );
}
