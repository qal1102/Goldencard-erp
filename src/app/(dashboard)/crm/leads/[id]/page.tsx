import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { queryLeadById } from '@/modules/crm/lib/lead.queries';
import { LeadDetail } from '@/modules/crm/components/lead-detail';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ linkedCustomer?: string; customerCreated?: string }>;
};

export default async function LeadDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  const [session, lead] = await Promise.all([auth(), queryLeadById(id)]);

  if (!lead) notFound();

  const roles = session?.user?.roles ?? [];
  const canEdit = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');
  const canManageSurvey = hasRole(roles, 'admin', 'director', 'sales');

  return (
    <div className="mx-auto w-full max-w-xl">
      <LeadDetail
        leadId={id}
        canEdit={canEdit}
        canManageSurvey={canManageSurvey}
        linkedCustomerNotice={query.linkedCustomer ?? null}
        customerCreatedNotice={query.customerCreated ?? null}
      />
    </div>
  );
}
