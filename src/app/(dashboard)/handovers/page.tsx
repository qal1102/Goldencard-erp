import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { ModuleGuide } from '@/components/ui/module-guide';
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
      <ModuleGuide
        className="mb-4"
        title="Hướng dẫn nhanh bàn giao"
        description="Bàn giao là bước xác nhận công trình đã hoàn tất với khách, trước khi cấp phiếu bảo hành và mở theo dõi sau bán hàng."
        steps={[
          'Tạo bàn giao từ lệnh thi công đã hoàn thành.',
          'Kiểm tra hạng mục đã làm, ảnh nghiệm thu và ghi chú còn tồn.',
          'Khi khách xác nhận, hoàn tất bàn giao để cấp bảo hành.',
          'Nếu còn vấn đề, ghi rõ để đội thi công xử lý trước khi đóng hồ sơ.',
        ]}
        note="Bàn giao sạch giúp bảo hành và CSKH về sau tra cứu đúng công trình."
      />

      <HandoverList
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
