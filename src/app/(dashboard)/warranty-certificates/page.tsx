import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { ModuleGuide } from '@/components/ui/module-guide';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { modulePerfLog, modulePerfTimed } from '@/lib/server/module-list-log';
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

const WARRANTY_CERTIFICATE_LOAD_TIMEOUT_MS = 8000;

type LoadWarrantyCertificatesResult = Awaited<ReturnType<typeof loadWarrantyCertificatesList>>;

function withWarrantyCertificateTimeout<T>(
  step: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      modulePerfLog(
        'warranty-certificates',
        `${step} timeout`,
        WARRANTY_CERTIFICATE_LOAD_TIMEOUT_MS,
      );
      resolve(fallback);
    }, WARRANTY_CERTIFICATE_LOAD_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export default async function WarrantyCertificatesPage() {
  const session = await modulePerfTimed('warranty-certificates', 'auth', () => verifySession());
  const roles = session.user.roles ?? [];

  if (!hasRole(roles, ...CERT_VIEW_ROLES)) {
    return <AccessDeniedMessage moduleName="phiếu bảo hành" />;
  }

  const loadResult = await withWarrantyCertificateTimeout<LoadWarrantyCertificatesResult>(
    'list load',
    modulePerfTimed('warranty-certificates', 'list load', () =>
      loadWarrantyCertificatesList({}, roles),
    ),
    { success: false, error: 'Tải danh sách phiếu bảo hành quá lâu. Vui lòng thử lại.' },
  );

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
        cacheScope={session.user.id}
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
