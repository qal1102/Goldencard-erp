import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { getAssignableUsersAction } from '@/modules/crm/actions/lead.actions';
import { LeadForm } from '@/modules/crm/components/lead-form';

export default async function NewLeadPage() {
  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant')) {
    redirect('/crm/leads');
  }

  const usersResult = await getAssignableUsersAction();
  const assignableUsers = usersResult.success ? usersResult.data : [];

  return (
    <div className="mx-auto w-full max-w-xl">
      <LeadForm mode="create" assignableUsers={assignableUsers} />
    </div>
  );
}
