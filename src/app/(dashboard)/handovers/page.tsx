import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { HandoverList } from '@/modules/handovers/components/handover-list';

export default async function HandoversPage() {
  const session = await auth();
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
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Bàn giao</h1>
        <p className="text-xs text-muted-foreground">
          Phiếu bàn giao sau khi hoàn thành thi công
        </p>
      </div>
      <HandoverList />
    </div>
  );
}
