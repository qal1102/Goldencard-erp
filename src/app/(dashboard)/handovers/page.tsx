import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { HandoverList } from '@/modules/handovers/components/handover-list';
import { loadHandoversList } from '@/modules/handovers/lib/handover-load';

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
] as const;

export default async function HandoversPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];

  if (!hasRole(roles, ...VIEW_ROLES)) {
    return <AccessDeniedMessage moduleName="bàn giao" />;
  }

  const loadResult = await loadHandoversList({}, roles);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Bàn giao</h1>
        <p className="text-xs text-muted-foreground">
          Phiếu bàn giao sau khi hoàn thành thi công
        </p>
      </div>
      <HandoverList
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
