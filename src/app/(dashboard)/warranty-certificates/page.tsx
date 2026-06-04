import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { WarrantyCertificateList } from '@/modules/warranty-certificates/components/warranty-certificate-list';
import { loadWarrantyCertificatesList } from '@/modules/warranty-certificates/lib/warranty-certificate-load';

const CERT_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

export default async function WarrantyCertificatesPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];

  if (!hasRole(roles, ...CERT_VIEW_ROLES)) {
    return <AccessDeniedMessage moduleName="phiếu bảo hành" />;
  }

  const loadResult = await loadWarrantyCertificatesList({}, roles);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Phiếu bảo hành</h1>
        <p className="text-xs text-muted-foreground">
          Phiếu bảo hành khách hàng sau bàn giao, kèm mã QR tra cứu công khai
        </p>
      </div>
      <WarrantyCertificateList
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
