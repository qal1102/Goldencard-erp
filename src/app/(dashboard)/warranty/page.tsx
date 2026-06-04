import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { WarrantyTicketList } from '@/modules/warranty-tickets/components/warranty-ticket-list';
import { loadWarrantyTicketsList } from '@/modules/warranty-tickets/lib/warranty-ticket-load';

const WARRANTY_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

const WARRANTY_WRITE_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'customer_service',
] as const;

export default async function WarrantyPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];

  if (!hasRole(roles, ...WARRANTY_VIEW_ROLES)) {
    return <AccessDeniedMessage moduleName="bảo hành / CSKH" />;
  }

  const canWrite = hasRole(roles, ...WARRANTY_WRITE_ROLES);
  const loadResult = await loadWarrantyTicketsList({}, roles);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Bảo hành / CSKH</h1>
        <p className="text-xs text-muted-foreground">
          Tiếp nhận và xử lý yêu cầu sau bàn giao
        </p>
      </div>
      <WarrantyTicketList
        canWrite={canWrite}
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
