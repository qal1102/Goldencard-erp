import { Badge } from '@/components/ui/badge';
import { ModuleGuide } from '@/components/ui/module-guide';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { modulePerfLog, modulePerfTimed } from '@/lib/server/module-list-log';
import { InventoryItemCatalog } from '@/modules/inventory/components/inventory-item-catalog';
import { WarehouseStockPanel } from '@/modules/inventory/components/warehouse-stock-panel';
import {
  loadInventoryItemsList,
  type LoadInventoryItemsResult,
} from '@/modules/inventory/lib/inventory-item-load';
import { INVENTORY_MANAGER_ROLES } from '@/modules/inventory/lib/inventory-permissions';
import {
  loadInventoryStockMovementsList,
  loadInventoryStocksList,
  loadInventoryWorkOrderOptions,
  loadWarehousesList,
  type LoadInventoryStocksResult,
  type LoadInventoryStockMovementsResult,
  type LoadInventoryWorkOrderOptionsResult,
  type LoadWarehousesResult,
} from '@/modules/inventory/lib/warehouse-load';

const INVENTORY_LOAD_TIMEOUT_MS = 8000;

function withInventoryTimeout<T>(
  step: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      modulePerfLog('inventory', `${step} timeout`, INVENTORY_LOAD_TIMEOUT_MS);
      resolve(fallback);
    }, INVENTORY_LOAD_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export default async function InventoryPage() {
  const session = await modulePerfTimed('inventory', 'auth', () => verifySession());
  const roles = session.user.roles ?? [];
  const canManageInventory = hasRole(roles, ...INVENTORY_MANAGER_ROLES);

  const [
    itemsResult,
    warehousesResult,
    stocksResult,
    movementsResult,
    workOrdersResult,
  ] = await Promise.all([
    withInventoryTimeout<LoadInventoryItemsResult>(
      'items load',
      modulePerfTimed('inventory', 'items load', () => loadInventoryItemsList({})),
      { success: false, error: 'Tải danh mục vật tư quá lâu. Vui lòng thử lại.' },
    ),
    withInventoryTimeout<LoadWarehousesResult>(
      'warehouses load',
      modulePerfTimed('inventory', 'warehouses load', () => loadWarehousesList({})),
      { success: false, error: 'Tải danh sách kho quá lâu. Vui lòng thử lại.' },
    ),
    withInventoryTimeout<LoadInventoryStocksResult>(
      'stocks load',
      modulePerfTimed('inventory', 'stocks load', () => loadInventoryStocksList()),
      { success: false, error: 'Tải tồn kho quá lâu. Vui lòng thử lại.' },
    ),
    withInventoryTimeout<LoadInventoryStockMovementsResult>(
      'movements load',
      modulePerfTimed('inventory', 'movements load', () => loadInventoryStockMovementsList()),
      { success: false, error: 'Tải lịch sử kho quá lâu. Vui lòng thử lại.' },
    ),
    canManageInventory
      ? withInventoryTimeout<LoadInventoryWorkOrderOptionsResult>(
          'work orders load',
          modulePerfTimed('inventory', 'work orders load', () => loadInventoryWorkOrderOptions()),
          { success: false, error: 'Tải danh sách lệnh thi công quá lâu. Vui lòng thử lại.' },
        )
      : Promise.resolve({ success: true as const, data: [] }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Quản lý kho</Badge>
          <Badge variant="outline">Vật tư</Badge>
          <Badge variant="outline">Tồn kho</Badge>
          <Badge variant="outline">Nhập / xuất</Badge>
          <Badge variant="outline">Nội bộ nhập liệu</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kho vật tư</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Theo dõi danh mục vật tư, kho vật lý, số tồn theo kho và lịch sử
            nhập/xuất/trả kho. Tất cả tài khoản nội bộ có thể xem kho; chỉ kế toán, kỹ thuật trưởng,
            quản lý dự án và ban giám đốc được thêm mã vật tư, nhập/xuất/trả kho hoặc kiểm kê. Hệ thống lưu
            nhật ký người thao tác để truy vết.
          </p>
        </div>
      </div>

      <ModuleGuide
        title="Hướng dẫn quy trình kho"
        description="Kho chia làm hai phần rõ ràng: danh mục mã vật tư để hệ thống nhận diện hàng hóa, và phiếu kho để ghi nhận số lượng thật phát sinh."
        steps={[
          'Bước 1: Thêm mã vật tư/SKU hoặc import danh mục từ Excel.',
          'Bước 2: Tạo kho vật lý như Kho tổng, kho công trình hoặc kho bảo hành.',
          'Bước 3: Nhập tồn đầu kỳ bằng số kiểm kê thực tế đang có.',
          'Bước 4: Vận hành hằng ngày bằng phiếu nhập kho, xuất kho, trả kho, chuyển kho và điều chỉnh kiểm kê.',
        ]}
        note="Không xóa cứng vật tư hoặc kho đã phát sinh lịch sử; hãy dùng Ngừng sử dụng để giữ dữ liệu truy vết."
      />

      <WarehouseStockPanel
        canManageInventory={canManageInventory}
        initialWarehouses={warehousesResult.success ? warehousesResult.data : undefined}
        initialWarehouseError={warehousesResult.success ? null : warehousesResult.error}
        initialStocks={stocksResult.success ? stocksResult.data : undefined}
        initialStockError={stocksResult.success ? null : stocksResult.error}
        initialMovements={movementsResult.success ? movementsResult.data : undefined}
        initialMovementError={movementsResult.success ? null : movementsResult.error}
        workOrders={workOrdersResult.success ? workOrdersResult.data : undefined}
        workOrderError={workOrdersResult.success ? null : workOrdersResult.error}
        inventoryItems={itemsResult.success ? itemsResult.data : undefined}
      />

      <InventoryItemCatalog
        canManageInventory={canManageInventory}
        initialItems={itemsResult.success ? itemsResult.data : undefined}
        initialError={itemsResult.success ? null : itemsResult.error}
      />
    </div>
  );
}
