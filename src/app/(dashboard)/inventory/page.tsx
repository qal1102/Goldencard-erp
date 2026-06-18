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
          <Badge variant="secondary">Kho bước 2</Badge>
          <Badge variant="outline">Chỉ Super Admin</Badge>
        </div>
        <Card>
          <CardContent className="p-5">
            <h1 className="text-lg font-semibold">Bạn chưa có quyền quản lý Kho</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Module Kho hiện đang ở bước catalog vật tư và chỉ mở cho Super Admin.
              Nếu bạn cần thao tác ở đây, hãy dùng tài khoản Super Admin hoặc cập nhật
              phân quyền trước.
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
          <Badge variant="secondary">Kho bước 2</Badge>
          <Badge variant="outline">Catalog vật tư</Badge>
          <Badge variant="outline">Chỉ Super Admin</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Danh mục vật tư</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Chuẩn hóa mã vật tư, tên, nhóm, đơn vị và tồn tối thiểu trước khi bật tồn
            kho thật. Bước này chưa nhập kho, xuất kho, giữ hàng hoặc nối BOM.
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
