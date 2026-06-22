import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { verifySession } from '@/lib/auth/dal';
import { assertSuperAdminFromDb } from '@/lib/auth/super-admin';
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
  const isSuperAdmin = await assertSuperAdminFromDb(session.user.id);

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Quản lý kho</Badge>
          <Badge variant="outline">Chỉ Super Admin</Badge>
        </div>
        <Card>
          <CardContent className="p-5">
            <h1 className="text-lg font-semibold">Bạn chưa có quyền quản lý kho</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Module kho đang dùng cho danh mục vật tư, kho vật lý, tồn kho và nhập/xuất
              kho. Chỉ Super Admin được thao tác để tránh sai lệch số tồn.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    loadInventoryWorkOrderOptions(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Quản lý kho</Badge>
          <Badge variant="outline">Vật tư</Badge>
          <Badge variant="outline">Tồn kho</Badge>
          <Badge variant="outline">Nhập / xuất</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kho vật tư</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Theo dõi danh mục vật tư, kho vật lý, số tồn theo kho và lịch sử
            nhập/xuất. Khi xuất kho có thể gắn với lệnh thi công để giữ được
            dấu vết công trình.
          </p>
        </div>
      </div>

      <WarehouseStockPanel
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
        initialItems={itemsResult.success ? itemsResult.data : undefined}
        initialError={itemsResult.success ? null : itemsResult.error}
      />
    </div>
  );
}
