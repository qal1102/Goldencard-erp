import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { queryContractById } from '@/modules/contracts/lib/contract.queries';
import { ContractDetail } from '@/modules/contracts/components/contract-detail';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ContractDetailPage({ params }: Props) {
  const { id } = await params;

  const [session, contract] = await Promise.all([auth(), queryContractById(id)]);
  if (!contract) notFound();

  const roles = session?.user?.roles ?? [];
  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant', 'accountant')) {
    notFound();
  }

  const canWrite = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');
  const canApprove = hasRole(roles, 'admin', 'director', 'chief_accountant');

  return (
    <div className="mx-auto w-full max-w-xl">
      <ContractDetail
        key={id}
        contractId={id}
        canWrite={canWrite}
        canApprove={canApprove}
      />
    </div>
  );
}
