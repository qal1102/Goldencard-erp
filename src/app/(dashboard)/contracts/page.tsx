import { redirect } from 'next/navigation';
import { ModuleGuide } from '@/components/ui/module-guide';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { modulePerfLog, modulePerfTimed } from '@/lib/server/module-list-log';
import { ContractList } from '@/modules/contracts/components/contract-list';
import { loadContractsList } from '@/modules/contracts/lib/contract-load';

const CONTRACT_LOAD_TIMEOUT_MS = 8000;

type LoadContractsResult = Awaited<ReturnType<typeof loadContractsList>>;

function withContractTimeout<T>(
  step: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      modulePerfLog('contracts', `${step} timeout`, CONTRACT_LOAD_TIMEOUT_MS);
      resolve(fallback);
    }, CONTRACT_LOAD_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export default async function ContractsPage() {
  const session = await modulePerfTimed('contracts', 'auth', () => verifySession());
  const roles = session.user.roles ?? [];

  if (
    !hasRole(roles, 'admin', 'director', 'sales', 'project_manager', 'chief_engineer', 'chief_accountant', 'accountant')
  ) {
    redirect('/dashboard');
  }

  const loadResult = await withContractTimeout<LoadContractsResult>(
    'list load',
    modulePerfTimed('contracts', 'list load', () => loadContractsList({}, roles)),
    { success: false, error: 'Tải danh sách hợp đồng quá lâu. Vui lòng thử lại.' },
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Hợp đồng</h1>
        <p className="text-sm text-muted-foreground">
          Hợp đồng tạo từ báo giá đã được khách đồng ý
        </p>
      </div>
      <ModuleGuide
        className="mb-4"
        title="Hướng dẫn nhanh hợp đồng"
        description="Hợp đồng là bước chốt sau khi khách đồng ý báo giá, dùng để theo dõi ký kết và mở lệnh thi công."
        steps={[
          'Tạo hợp đồng từ báo giá đã được khách duyệt.',
          'Kiểm tra thông tin khách, giá trị, phạm vi thi công và điều khoản.',
          'Sau khi ký, chuyển sang lệnh thi công để phân công đội thực hiện.',
          'Không tạo hợp đồng rời nếu chưa có báo giá hợp lệ.',
        ]}
        note="Hợp đồng là mốc pháp lý chính, nên mọi chỉnh sửa cần có ghi chú rõ lý do."
      />

      <ContractList
        cacheScope={session.user.id}
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
