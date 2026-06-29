import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ModuleGuide } from '@/components/ui/module-guide';
import { Skeleton } from '@/components/ui/skeleton';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { LeadFilters } from '@/modules/crm/components/lead-filters';
import { LeadPipeline } from '@/modules/crm/components/lead-pipeline';

export default async function CrmLeadsPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];
  const canCreate = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-lg font-medium">CRM / Cơ hội</h1>
          <p className="text-xs text-muted-foreground">Quản lý khách tiềm năng</p>
        </div>
        {canCreate && (
          <Button size="sm" nativeButton={false} render={<Link href="/crm/leads/new" />}>
            <PlusIcon className="size-4" />
            Thêm cơ hội
          </Button>
        )}
      </div>

      <ModuleGuide
        title="Hướng dẫn nhanh CRM"
        description="Dùng màn hình này để ghi nhận cơ hội mới, theo dõi sales đã liên hệ tới đâu và quyết định khi nào chuyển thành khách hàng thật."
        steps={[
          'Tạo cơ hội khi có khách mới hoặc nguồn giới thiệu mới.',
          'Cập nhật trạng thái sau mỗi lần gọi, nhắn tin hoặc khách phản hồi.',
          'Khi khách đủ thông tin và có nhu cầu rõ, chuyển sang hồ sơ khách hàng.',
          'Tránh tạo trùng bằng cách tìm số điện thoại hoặc tên trước khi thêm mới.',
        ]}
        note="Sales nên ghi chú kết quả liên hệ thật rõ để quản lý nhìn pipeline là biết khách đang ở bước nào."
      />

      <Suspense fallback={<Skeleton className="h-8 w-full" />}>
        <LeadFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="flex gap-3 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 w-[280px] flex-shrink-0 rounded-xl" />
            ))}
          </div>
        }
      >
        <LeadPipeline />
      </Suspense>
    </div>
  );
}
