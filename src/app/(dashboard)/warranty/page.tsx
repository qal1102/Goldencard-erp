import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { ModuleGuide } from '@/components/ui/module-guide';
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
      <ModuleGuide
        className="mb-4"
        title="Hướng dẫn nhanh bảo hành / CSKH"
        description="Module này dùng để tiếp nhận yêu cầu sau bàn giao, theo dõi xử lý và giữ lịch sử chăm sóc khách hàng."
        steps={[
          'Tạo yêu cầu từ khách hàng hoặc phiếu bàn giao đã hoàn tất.',
          'Ghi rõ vấn đề khách phản ánh, mức ưu tiên và người phụ trách.',
          'Cập nhật trạng thái sau mỗi lần liên hệ hoặc xử lý thực tế.',
          'Đóng yêu cầu khi khách đã được phản hồi và vấn đề đã xử lý xong.',
        ]}
        note="Mỗi yêu cầu nên có ghi chú phản hồi thật, tránh để quản lý không biết khách đã được chăm sóc hay chưa."
      />

      <WarrantyTicketList
        canWrite={canWrite}
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
