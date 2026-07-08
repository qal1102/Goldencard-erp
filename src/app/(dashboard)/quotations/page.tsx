import { redirect } from 'next/navigation';
import { ModuleGuide } from '@/components/ui/module-guide';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { modulePerfLog, modulePerfTimed } from '@/lib/server/module-list-log';
import { queryActiveInventoryItemOptions } from '@/modules/inventory/lib/inventory-item.queries';
import { QuotationPriceCatalogPanel } from '@/modules/quotations/components/quotation-price-catalog-panel';
import { QuotationList } from '@/modules/quotations/components/quotation-list';
import { loadQuotationsList } from '@/modules/quotations/lib/quotation-load';
import type { QuotationPriceCatalogRow } from '@/modules/quotations/lib/quotation-price-catalog.queries';
import { queryQuotationPriceCatalog } from '@/modules/quotations/lib/quotation-price-catalog.queries';

const QUOTATION_LOAD_TIMEOUT_MS = 8000;

type LoadQuotationsResult = Awaited<ReturnType<typeof loadQuotationsList>>;

type PriceCatalogLoadResult =
  | { success: true; data: QuotationPriceCatalogRow[] }
  | { success: false; error: string };

function withQuotationTimeout<T>(
  step: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      modulePerfLog('quotations', `${step} timeout`, QUOTATION_LOAD_TIMEOUT_MS);
      resolve(fallback);
    }, QUOTATION_LOAD_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export default async function QuotationsPage() {
  const session = await modulePerfTimed('quotations', 'auth', () => verifySession());
  const roles = session.user.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'project_manager', 'chief_engineer', 'chief_accountant', 'accountant')) {
    redirect('/dashboard');
  }

  const canWrite = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');
  const canManagePricing = hasRole(roles, 'admin', 'director', 'chief_accountant', 'accountant');
  const [loadResult, priceCatalogResult, inventoryItems] = await Promise.all([
    withQuotationTimeout<LoadQuotationsResult>(
      'list load',
      modulePerfTimed('quotations', 'list load', () => loadQuotationsList({}, roles)),
      { success: false, error: 'Tải danh sách báo giá quá lâu. Vui lòng thử lại.' },
    ),
    withQuotationTimeout<PriceCatalogLoadResult>(
      'price catalog load',
      modulePerfTimed('quotations', 'price catalog load', async () => ({
        success: true as const,
        data: await queryQuotationPriceCatalog({ status: 'active' }),
      })),
      { success: false, error: 'Tải bảng giá bán quá lâu. Vui lòng thử lại.' },
    ),
    withQuotationTimeout(
      'inventory options load',
      modulePerfTimed('quotations', 'inventory options load', () => queryActiveInventoryItemOptions()),
      [],
    ),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl">
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

      <QuotationPriceCatalogPanel
        initialRows={priceCatalogResult.success ? priceCatalogResult.data : undefined}
        initialError={priceCatalogResult.success ? null : priceCatalogResult.error}
        inventoryItems={inventoryItems}
        canManagePricing={canManagePricing}
      />

      <QuotationList
        initialData={loadResult.success ? loadResult.data : undefined}
        initialError={loadResult.success ? null : loadResult.error}
      />
    </div>
  );
}
