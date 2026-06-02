import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { getAssignableUsersAction } from '@/modules/crm/actions/lead.actions';
import { getCustomerAction } from '@/modules/crm/actions/customer.actions';
import { LeadForm } from '@/modules/crm/components/lead-form';
import type { CreateLeadInput } from '@/modules/crm/schema/lead.schema';

type Props = {
  searchParams: Promise<{ customerId?: string }>;
};

export default async function NewLeadPage({ searchParams }: Props) {
  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant')) {
    redirect('/crm/leads');
  }

  const { customerId } = await searchParams;
  const usersResult = await getAssignableUsersAction();
  const assignableUsers = usersResult.success ? usersResult.data : [];

  let defaultValues: Partial<CreateLeadInput> | undefined;
  let linkedCustomer: { id: string; code: string; fullName: string } | undefined;

  if (customerId) {
    const customerResult = await getCustomerAction(customerId);
    if (customerResult.success && customerResult.data) {
      const customer = customerResult.data;
      linkedCustomer = {
        id: customer.id,
        code: customer.code,
        fullName: customer.fullName,
      };
      defaultValues = {
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email ?? undefined,
        source: 'direct',
        customerId: customer.id,
      };
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <LeadForm
        mode="create"
        assignableUsers={assignableUsers}
        defaultValues={defaultValues}
        linkedCustomer={linkedCustomer}
      />
    </div>
  );
}
