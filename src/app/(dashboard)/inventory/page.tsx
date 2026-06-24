import { Badge } from '@/components/ui/badge';
import { verifySession } from '@/lib/auth/dal';
import { hasRole } from '@/lib/auth/roles';
import { InventoryItemCatalog } from '@/modules/inventory/components/inventory-item-catalog';
import { WarehouseStockPanel } from '@/modules/inventory/components/warehouse-stock-panel';
import { loadInventoryItemsList } from '@/modules/inventory/lib/inventory-item-load';
import {
  loadInventoryStockMovementsList,
  loadInventoryStocksList,
  loadInventoryWorkOrderOptions,
  loadWarehousesList,
} from '@/modules/inventory/lib/warehouse-load';

export default async function InventoryPage() {
  const session = await verifySession();
  const roles = session.user.roles ?? [];
  const canManageInventory = hasRole(
    roles,
    'admin',
    'director',
    'chief_accountant',
    'accountant',
    'technician',
  );

  const [
    itemsResult,
    warehousesResult,
    stocksResult,
    movementsResult,
    workOrdersResult,
  ] = await Promise.all([
    loadInventoryItemsList({}),
    loadWarehousesList({}),
    loadInventoryStocksList(),
    loadInventoryStockMovementsList(),
    canManageInventory
      ? loadInventoryWorkOrderOptions()
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
            nhập/xuất. Tất cả tài khoản nội bộ có thể xem kho; chỉ kế toán, kỹ thuật,
            ban giám đốc và quản lý được tạo, nhập/xuất hoặc chỉnh kho. Hệ thống lưu
            nhật ký người thao tác để truy vết.
          </p>
        </div>
      </div>

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
