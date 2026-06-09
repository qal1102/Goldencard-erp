'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  EditIcon,
  PlusIcon,
  RefreshCwIcon,
  WarehouseIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createWarehouseAction,
  getWarehousesAction,
  updateWarehouseAction,
} from '../actions/warehouse.actions';
import type {
  SerializedInventoryStockRow,
} from '../lib/warehouse-load';
import type { SerializedWarehouse } from '../lib/warehouse-serialize';
import type {
  WarehouseFilters,
  WarehouseFormInput,
} from '../schema/warehouse.schema';

const ALL_STATUS = 'all';
type WarehouseStatus = NonNullable<WarehouseFilters['status']>;

const warehouseStatusLabels: Record<WarehouseStatus, string> = {
  all: 'Tất cả trạng thái',
  active: 'Đang sử dụng',
  inactive: 'Ngừng sử dụng',
};

function getWarehouseStatusLabel(value: string | null) {
  if (!value) return warehouseStatusLabels.all;
  return warehouseStatusLabels[value as WarehouseStatus] ?? warehouseStatusLabels.all;
}

function formatNumber(value: string | number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 3,
  }).format(numericValue);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

const emptyForm: WarehouseFormInput = {
  code: '',
  name: '',
  address: '',
  note: '',
  isActive: true,
};

type DialogMode =
  | { type: 'create'; warehouse?: undefined }
  | { type: 'edit'; warehouse: SerializedWarehouse };

function warehouseToForm(warehouse: SerializedWarehouse): WarehouseFormInput {
  return {
    code: warehouse.code,
    name: warehouse.name,
    address: warehouse.address ?? '',
    note: warehouse.note ?? '',
    isActive: warehouse.isActive,
  };
}

function WarehouseDialog({
  mode,
  open,
  onOpenChange,
  onSaved,
  refreshFilters,
}: {
  mode: DialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (warehouses: SerializedWarehouse[]) => void;
  refreshFilters: WarehouseFilters;
}) {
  const [form, setForm] = useState<WarehouseFormInput>(
    mode.type === 'edit' ? warehouseToForm(mode.warehouse) : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof WarehouseFormInput>(
    key: K,
    value: WarehouseFormInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result =
        mode.type === 'edit'
          ? await updateWarehouseAction(mode.warehouse.id, form)
          : await createWarehouseAction(form);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const refreshed = await getWarehousesAction(refreshFilters);
      if (refreshed.success) onSaved(refreshed.data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{mode.type === 'edit' ? 'Sửa kho' : 'Tạo kho'}</DialogTitle>
            <DialogDescription>
              Kho vật lý dùng để theo dõi tồn theo địa điểm. Số tồn sẽ được cập nhật ở
              bước phiếu nhập/xuất sau.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="warehouse-code">Mã kho</Label>
              <Input
                id="warehouse-code"
                value={form.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder="VD: KHO-TONG"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="warehouse-name">Tên kho</Label>
              <Input
                id="warehouse-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="VD: Kho tổng"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouse-address">Địa chỉ</Label>
            <Input
              id="warehouse-address"
              value={form.address ?? ''}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Địa chỉ kho nếu cần"
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouse-note">Ghi chú</Label>
            <Textarea
              id="warehouse-note"
              value={form.note ?? ''}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder="Thông tin nội bộ"
              rows={3}
              disabled={isPending}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              disabled={isPending}
            />
            <span>
              <span className="font-medium">Đang sử dụng</span>
              <span className="block text-xs text-muted-foreground">
                Tắt nếu kho không còn dùng, dữ liệu cũ vẫn được giữ lại.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang lưu...' : 'Lưu kho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  initialWarehouses?: SerializedWarehouse[];
  initialWarehouseError?: string | null;
  initialStocks?: SerializedInventoryStockRow[];
  initialStockError?: string | null;
};

export function WarehouseStockPanel({
  initialWarehouses = [],
  initialWarehouseError = null,
  initialStocks = [],
  initialStockError = null,
}: Props) {
  const [warehouses, setWarehouses] = useState(initialWarehouses);
  const [warehouseStatus, setWarehouseStatus] = useState<WarehouseStatus>(ALL_STATUS);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [warehouseError, setWarehouseError] = useState<string | null>(initialWarehouseError);
  const [stockError] = useState<string | null>(initialStockError);
  const [isPending, startTransition] = useTransition();

  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.isActive).length,
    [warehouses],
  );

  const filteredStocks = useMemo(
    () =>
      selectedWarehouseId === 'all'
        ? initialStocks
        : initialStocks.filter((row) => row.warehouseId === selectedWarehouseId),
    [initialStocks, selectedWarehouseId],
  );

  const stockTotals = useMemo(() => {
    const totalOnHand = filteredStocks.reduce(
      (sum, row) => sum + Number(row.quantityOnHand),
      0,
    );
    const totalReserved = filteredStocks.reduce(
      (sum, row) => sum + Number(row.quantityReserved),
      0,
    );
    return {
      lines: filteredStocks.length,
      totalOnHand,
      totalReserved,
    };
  }, [filteredStocks]);

  const currentFilters = useMemo(
    () => ({
      status: warehouseStatus,
    }),
    [warehouseStatus],
  );

  function loadWarehouses(next?: Partial<WarehouseFilters>) {
    const filters = {
      ...currentFilters,
      ...next,
    };

    startTransition(async () => {
      const result = await getWarehousesAction(filters);
      if (!result.success) {
        setWarehouseError(result.error);
        return;
      }
      setWarehouseError(null);
      setWarehouses(result.data);
    });
  }

  function handleWarehouseStatusChange(value: WarehouseStatus | null) {
    const nextStatus = value ?? ALL_STATUS;
    setWarehouseStatus(nextStatus);
    loadWarehouses({ status: nextStatus });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Tổng kho</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {warehouses.length}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Kho đang dùng</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{activeWarehouses}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Dòng tồn</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {stockTotals.lines}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Tổng tồn khả dụng</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatNumber(stockTotals.totalOnHand - stockTotals.totalReserved)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium">Kho vật lý</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tạo các địa điểm kho để chuẩn bị theo dõi tồn. Bước này chưa cho sửa số
              tồn trực tiếp.
            </p>
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => setDialogMode({ type: 'create' })}
          >
            <PlusIcon className="size-4" />
            Tạo kho
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={warehouseStatus} onValueChange={handleWarehouseStatusChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue>{(value) => getWarehouseStatusLabel(value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{warehouseStatusLabels.all}</SelectItem>
              <SelectItem value="active">{warehouseStatusLabels.active}</SelectItem>
              <SelectItem value="inactive">{warehouseStatusLabels.inactive}</SelectItem>
            </SelectContent>
          </Select>
          {isPending && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCwIcon className="size-3 animate-spin" />
              Đang tải kho...
            </span>
          )}
        </div>

        {warehouseError && (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {warehouseError}
          </p>
        )}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {warehouses.map((warehouse) => (
            <div key={warehouse.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-primary">
                      {warehouse.code}
                    </p>
                    <Badge variant={warehouse.isActive ? 'secondary' : 'outline'}>
                      {warehouse.isActive ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                    </Badge>
                  </div>
                  <h2 className="mt-1 font-medium">{warehouse.name}</h2>
                  {warehouse.address && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {warehouse.address}
                    </p>
                  )}
                  {warehouse.note && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {warehouse.note}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogMode({ type: 'edit', warehouse })}
                >
                  <EditIcon className="size-4" />
                  Sửa
                </Button>
              </div>
            </div>
          ))}
        </div>

        {!warehouseError && !isPending && warehouses.length === 0 && (
          <p className="mt-3 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Chưa có kho phù hợp.
          </p>
        )}
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium">Tồn kho theo kho</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bảng này chỉ đọc dữ liệu tồn hiện có. Tồn sẽ thay đổi khi có phiếu nhập,
              xuất hoặc điều chỉnh kho ở bước sau.
            </p>
          </div>
          <Select value={selectedWarehouseId} onValueChange={(value) => setSelectedWarehouseId(value ?? 'all')}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue>
                {(value) =>
                  value === 'all'
                    ? 'Tất cả kho'
                    : warehouses.find((warehouse) => warehouse.id === value)?.name ??
                      'Tất cả kho'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kho</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {stockError && (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {stockError}
          </p>
        )}

        {!stockError && filteredStocks.length === 0 && (
          <div className="mt-3 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <WarehouseIcon className="mx-auto mb-2 size-5" />
            Chưa có dòng tồn kho. Sau khi tạo phiếu nhập kho hoặc điều chỉnh kho, dữ
            liệu sẽ hiển thị tại đây.
          </div>
        )}

        {filteredStocks.length > 0 && (
          <div className="mt-3 max-h-96 overflow-auto rounded-md border">
            <div className="grid min-w-[920px] grid-cols-[150px_140px_1.3fr_80px_120px_120px_120px] border-b bg-muted/60 px-3 py-2 text-xs font-medium">
              <span>Kho</span>
              <span>Mã vật tư</span>
              <span>Tên vật tư</span>
              <span>Đơn vị</span>
              <span>Tồn thực tế</span>
              <span>Đã giữ</span>
              <span>Cập nhật</span>
            </div>
            {filteredStocks.map((row) => (
              <div
                key={row.id}
                className="grid min-w-[920px] grid-cols-[150px_140px_1.3fr_80px_120px_120px_120px] border-b px-3 py-2 text-xs last:border-b-0"
              >
                <span className="truncate">{row.warehouseName}</span>
                <span className="font-mono text-primary">{row.itemSku}</span>
                <span className="truncate">{row.itemName}</span>
                <span>{row.itemUnit}</span>
                <span className="tabular-nums">{formatNumber(row.quantityOnHand)}</span>
                <span className="tabular-nums">{formatNumber(row.quantityReserved)}</span>
                <span className="text-muted-foreground">{formatDateTime(row.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogMode && (
        <WarehouseDialog
          key={dialogMode.type === 'edit' ? dialogMode.warehouse.id : 'create'}
          mode={dialogMode}
          open={Boolean(dialogMode)}
          onOpenChange={(open) => {
            if (!open) setDialogMode(null);
          }}
          onSaved={setWarehouses}
          refreshFilters={currentFilters}
        />
      )}
    </div>
  );
}
