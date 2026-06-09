import { Badge } from '@/components/ui/badge';
import { requireSuperAdminPage } from '@/lib/auth/super-admin';
import { InventoryItemCatalog } from '@/modules/inventory/components/inventory-item-catalog';
import { loadInventoryItemsList } from '@/modules/inventory/lib/inventory-item-load';

export default async function InventoryPage() {
  await requireSuperAdminPage();

  const itemsResult = await loadInventoryItemsList({});

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
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

      <InventoryItemCatalog
        initialItems={itemsResult.success ? itemsResult.data : undefined}
        initialError={itemsResult.success ? null : itemsResult.error}
      />
    </div>
  );
}
