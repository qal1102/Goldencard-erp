import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { getAssignableUsersAction } from '@/modules/crm/actions/lead.actions';
import { LeadForm } from '@/modules/crm/components/lead-form';
import { queryLeadById } from '@/modules/crm/lib/lead.queries';
import type { LeadSource } from '@/modules/crm/schema/lead.schema';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditLeadPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant')) {
    redirect(`/crm/leads/${id}`);
  }

  const [lead, usersResult] = await Promise.all([queryLeadById(id), getAssignableUsersAction()]);

  if (!lead) notFound();

  if (lead.status === 'won' || lead.status === 'lost') {
    redirect(`/crm/leads/${id}`);
  }

  const assignableUsers = usersResult.success ? usersResult.data : [];

  return (
    <div className="mx-auto w-full max-w-xl">
      <LeadForm
        mode="edit"
        leadId={id}
        assignableUsers={assignableUsers}
        defaultValues={{
          fullName: lead.fullName,
          phone: lead.phone,
          email: lead.email ?? undefined,
          address: lead.address ?? undefined,
          province: lead.province ?? undefined,
          source: lead.source as LeadSource,
          expectedCapacity: lead.expectedCapacity ?? undefined,
          notes: lead.notes ?? undefined,
          assignedTo: lead.assignedTo ?? null,
        }}
      />
    </div>
  );
}
