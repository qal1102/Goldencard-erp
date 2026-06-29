import { redirect } from 'next/navigation';
import { ModuleGuide } from '@/components/ui/module-guide';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { QuotationList } from '@/modules/quotations/components/quotation-list';
import { loadQuotationsList } from '@/modules/quotations/lib/quotation-load';

export default async function QuotationsPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'project_manager', 'chief_engineer', 'chief_accountant', 'accountant')) {
    redirect('/dashboard');
  }

  const canWrite = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');
  const loadResult = await loadQuotationsList({}, roles);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Báo giá</h1>
          <p className="text-xs text-muted-foreground">Danh sách tất cả báo giá</p>
        </div>
        {canWrite && (
          <p className="text-xs text-muted-foreground">Tạo từ trang Khảo sát</p>
        )}
      </div>

      <ModuleGuide
        className="mb-4"
        title="Hướng dẫn nhanh báo giá"
        description="Báo giá được lập từ khảo sát đã đủ thông tin. Danh sách ưu tiên hiển thị bản báo giá cuối cùng, lịch sử chỉnh sửa xem trong chi tiết."
        steps={[
          'Mở phiếu khảo sát đã hoàn tất để tạo báo giá.',
          'Kiểm tra vật tư, chi phí, ghi chú và điều khoản trước khi gửi khách.',
          'Nếu cần sửa, tạo bản chỉnh sửa có lý do để lưu lịch sử.',
          'Khi khách đồng ý, chuyển báo giá sang hợp đồng.',
        ]}
        note="Không tạo nhiều báo giá rời cho cùng một nhu cầu; hãy chỉnh sửa có lý do để lịch sử rõ ràng."
      />

      <QuotationList
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
