import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { ModuleGuide } from '@/components/ui/module-guide';
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
      <ModuleGuide
        className="mb-4"
        title="Hướng dẫn nhanh phiếu bảo hành"
        description="Phiếu bảo hành là hồ sơ khách có thể tra cứu qua QR để xem sản phẩm, thời hạn và thông tin bảo hành."
        steps={[
          'Cấp phiếu từ bàn giao đã hoàn tất.',
          'Kiểm tra thông tin khách, sản phẩm, ngày bắt đầu và thời hạn bảo hành.',
          'In hoặc gửi QR cho khách để tra cứu công khai.',
          'Khi phát sinh CSKH, tạo yêu cầu bảo hành từ hồ sơ liên quan.',
        ]}
        note="QR chỉ nên công khai các thông tin cần cho khách tra cứu, không hiển thị dữ liệu nội bộ."
      />

      <WarrantyCertificateList
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
