import { PlusCircleIcon } from 'lucide-react';
import { ModuleGuide } from '@/components/ui/module-guide';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { SurveyList } from '@/modules/surveys/components/survey-list';
import { loadSurveysList } from '@/modules/surveys/lib/survey-load';

export default async function SurveysPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];
  const isTechnician =
    hasRole(roles, 'technician') &&
    !hasRole(roles, 'admin', 'director', 'sales', 'project_manager', 'chief_engineer');
  const loadResult = await loadSurveysList({}, roles, session.user.id);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Phiếu khảo sát</h1>
          <p className="text-xs text-muted-foreground">
            {isTechnician
              ? 'Danh sách phiếu được phân công cho bạn'
              : 'Danh sách tất cả phiếu khảo sát'}
          </p>
        </div>
        {!isTechnician && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <PlusCircleIcon className="size-3.5" />
            <span>Tạo từ trang Khách hàng</span>
          </div>
        )}
      </div>

      <ModuleGuide
        className="mb-4"
        title="Hướng dẫn nhanh khảo sát"
        description="Khảo sát dùng để kỹ thuật ghi nhận hiện trạng thực tế trước khi lập báo giá. Một phiếu khảo sát hoàn chỉnh sẽ là căn cứ cho báo giá."
        steps={[
          'Tạo phiếu từ hồ sơ khách hàng, sau đó phân công người đi khảo sát.',
          'Kỹ thuật cập nhật địa chỉ, ảnh, hiện trạng mái, ghi chú và kết quả khảo sát.',
          'Khi thông tin đã đủ, xác nhận hoàn tất để chuyển sang bước báo giá.',
          'Nếu khách không phản hồi hoặc cần hẹn lại, cập nhật trạng thái để sales và quản lý theo dõi.',
        ]}
        note="Không nên tạo báo giá khi phiếu khảo sát còn thiếu thông tin quan trọng về địa điểm, hiện trạng hoặc nhu cầu khách."
      />

      <SurveyList
        isTechnician={isTechnician}
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
