import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { queryLeadById } from '@/modules/crm/lib/lead.queries';
import { LeadDetail } from '@/modules/crm/components/lead-detail';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;

  const [session, lead] = await Promise.all([auth(), queryLeadById(id)]);

  if (!lead) notFound();

  const roles = session?.user?.roles ?? [];
  const canEdit = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');

  return (
    <div className="mx-auto w-full max-w-xl">
      <LeadDetail leadId={id} canEdit={canEdit} />
    </div>
  );
}
