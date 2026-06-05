import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { ContractList } from '@/modules/contracts/components/contract-list';

export default async function ContractsPage() {
  const session = await verifySession();
  if (
    !hasRole(session.user.roles ?? [], 'admin', 'director', 'sales', 'chief_accountant', 'accountant')
  ) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Hợp đồng</h1>
        <p className="text-sm text-muted-foreground">
          Hợp đồng tạo từ báo giá đã được khách đồng ý
        </p>
      </div>
      <ContractList />
    </div>
  );
}
