import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { ContractList } from '@/modules/contracts/components/contract-list';
import { loadContractsList } from '@/modules/contracts/lib/contract-load';

export default async function ContractsPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];

  if (
    !hasRole(roles, 'admin', 'director', 'sales', 'project_manager', 'chief_engineer', 'chief_accountant', 'accountant')
  ) {
    redirect('/dashboard');
  }

  const loadResult = await loadContractsList({}, roles);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Hợp đồng</h1>
        <p className="text-sm text-muted-foreground">
          Hợp đồng tạo từ báo giá đã được khách đồng ý
        </p>
      </div>
      <ContractList
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
