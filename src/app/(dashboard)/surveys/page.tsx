import { PlusCircleIcon } from 'lucide-react';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { SurveyList } from '@/modules/surveys/components/survey-list';

export default async function SurveysPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];
  const isTechnician =
    hasRole(roles, 'technician') && !hasRole(roles, 'admin', 'director', 'sales');

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

      <SurveyList isTechnician={isTechnician} />
    </div>
  );
}
