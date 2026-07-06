'use client';

import { Edit3Icon, PackageSearchIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
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
import type { InventoryItemOption } from '@/modules/inventory/lib/inventory-item.queries';
import {
  createQuotationPriceCatalogAction,
  getQuotationPriceCatalogAction,
  updateQuotationPriceCatalogAction,
} from '../actions/quotation-price-catalog.actions';
import type { QuotationPriceCatalogRow } from '../lib/quotation-price-catalog.queries';
import type {
  QuotationPriceCatalogFilters,
  QuotationPriceCatalogFormInput,
} from '../schema/quotation-price-catalog.schema';

const NONE_VALUE = '__none__';

type Props = {
  initialRows?: QuotationPriceCatalogRow[];
  initialError?: string | null;
  inventoryItems: InventoryItemOption[];
  canManagePricing: boolean;
};

type FormState = QuotationPriceCatalogFormInput;

const emptyForm: FormState = {
  inventoryItemId: null,
  displayName: '',
  description: null,
  category: null,
  unit: '',
  unitPrice: 0,
  isMainEquipment: false,
  isActive: true,
  note: null,
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function rowToForm(row: QuotationPriceCatalogRow): FormState {
  return {
    inventoryItemId: row.inventoryItemId,
    displayName: row.displayName,
    description: row.description,
    category: row.category,
    unit: row.unit,
    unitPrice: Number(row.unitPrice) || 0,
    isMainEquipment: row.isMainEquipment,
    isActive: row.isActive,
    note: row.note,
  };
}

export function QuotationPriceCatalogPanel({
  initialRows = [],
  initialError = null,
  inventoryItems,
  canManagePricing,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState(initialError);
  const [filters, setFilters] = useState<QuotationPriceCatalogFilters>({
    q: '',
    status: 'active',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<QuotationPriceCatalogRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCount = useMemo(() => rows.filter((row) => row.isActive).length, [rows]);

  const refresh = (nextFilters = filters) => {
    startTransition(async () => {
      const result = await getQuotationPriceCatalogAction(nextFilters);
      if (result.success) {
        setRows(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  };

  const openCreate = () => {
    setEditingRow(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: QuotationPriceCatalogRow) => {
    setEditingRow(row);
    setForm(rowToForm(row));
    setFormError(null);
    setDialogOpen(true);
  };

  const patchForm = (patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const applyInventoryItem = (value: string | null) => {
    const itemId = value === NONE_VALUE ? null : value;
    const item = inventoryItems.find((option) => option.id === itemId);
    if (!item) {
      patchForm({ inventoryItemId: null });
      return;
    }

    patchForm({
      inventoryItemId: item.id,
      displayName: form.displayName.trim() ? form.displayName : item.name,
      description: form.description?.trim() ? form.description : item.specification,
      category: form.category?.trim() ? form.category : item.category,
      unit: form.unit.trim() ? form.unit : item.unit,
    });
  };

  const submitForm = () => {
    setFormError(null);
    startTransition(async () => {
      const result = editingRow
        ? await updateQuotationPriceCatalogAction(editingRow.id, form)
        : await createQuotationPriceCatalogAction(form);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      setDialogOpen(false);
      setEditingRow(null);
      setForm(emptyForm);
      refresh(filters);
    });
  };

  const updateStatus = (row: QuotationPriceCatalogRow, isActive: boolean) => {
    startTransition(async () => {
      const result = await updateQuotationPriceCatalogAction(row.id, {
        ...rowToForm(row),
        isActive,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      refresh(filters);
    });
  };

  const submitFilters = () => {
    refresh(filters);
  };

  return (
    <section className="mb-4 rounded-xl border bg-card p-3 text-card-foreground sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Bảng giá bán</h2>
            <Badge variant="secondary">{activeCount} đang dùng</Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Giá chuẩn để đổ nhanh vào báo giá. Kho vẫn quản lý vật tư, bảng này quản lý giá bán cho khách.
          </p>
        </div>
        {canManagePricing && (
          <Button type="button" size="sm" onClick={openCreate} className="w-full sm:w-auto">
            <PlusIcon className="size-4" />
            Thêm giá bán
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitFilters();
            }}
            placeholder="Tìm theo tên, SKU, nhóm..."
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status ?? 'active'}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: value as QuotationPriceCatalogFilters['status'],
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Đang sử dụng</SelectItem>
            <SelectItem value="inactive">Ngừng sử dụng</SelectItem>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={submitFilters}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          Lọc
        </Button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {isPending && rows.length === 0 && (
        <p className="mt-3 rounded-lg border bg-muted/40 px-3 py-4 text-center text-sm text-muted-foreground">
          Đang tải bảng giá...
        </p>
      )}

      {!isPending && rows.length === 0 && (
        <div className="mt-3 rounded-lg border border-dashed px-3 py-5 text-center">
          <PackageSearchIcon className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Chưa có dòng bảng giá phù hợp</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thêm các bộ chính như tấm pin, inverter, pin lưu trữ để lập báo giá nhanh hơn.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{row.displayName}</h3>
                    {row.isMainEquipment && <Badge>Thiết bị chính</Badge>}
                    <Badge variant={row.isActive ? 'secondary' : 'outline'}>
                      {row.isActive ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.category ?? 'Chưa phân nhóm'} · {row.unit}
                    {row.inventorySku ? ` · ${row.inventorySku}` : ''}
                  </p>
                  {row.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {row.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(row.unitPrice)}
                  </p>
                  {canManagePricing && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(row)}
                      >
                        <Edit3Icon className="size-3.5" />
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant={row.isActive ? 'destructive' : 'secondary'}
                        size="sm"
                        onClick={() => updateStatus(row, !row.isActive)}
                        disabled={isPending}
                      >
                        {row.isActive ? 'Ngừng dùng' : 'Bật lại'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRow ? 'Sửa giá bán' : 'Thêm giá bán'}</DialogTitle>
            <DialogDescription>
              Dòng giá bán có thể gắn với vật tư kho để lấy đúng quy cách và ảnh khi xuất báo giá.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Gắn với vật tư kho</Label>
              <Select
                value={form.inventoryItemId ?? NONE_VALUE}
                onValueChange={applyInventoryItem}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Không gắn vật tư kho">
                    {(value) => {
                      if (!value || value === NONE_VALUE) return 'Không gắn vật tư kho';
                      const item = inventoryItems.find((option) => option.id === value);
                      return item ? `${item.sku} - ${item.name}` : 'Không gắn vật tư kho';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Không gắn vật tư kho</SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="price-display-name" className="text-xs">
                Tên hiển thị <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price-display-name"
                value={form.displayName}
                onChange={(event) => patchForm({ displayName: event.target.value })}
                placeholder="VD: Tấm pin JA Solar 550W"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="price-category" className="text-xs">Nhóm</Label>
                <Input
                  id="price-category"
                  value={form.category ?? ''}
                  onChange={(event) => patchForm({ category: event.target.value })}
                  placeholder="VD: Tấm pin"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="price-unit" className="text-xs">
                  Đơn vị <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price-unit"
                  value={form.unit}
                  onChange={(event) => patchForm({ unit: event.target.value })}
                  placeholder="VD: tấm"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="price-unit-price" className="text-xs">
                Đơn giá bán <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price-unit-price"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form.unitPrice}
                onChange={(event) => patchForm({ unitPrice: Number(event.target.value) || 0 })}
                placeholder="VD: 2500000"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="price-description" className="text-xs">Mô tả</Label>
              <Textarea
                id="price-description"
                rows={3}
                value={form.description ?? ''}
                onChange={(event) => patchForm({ description: event.target.value })}
                placeholder="Model, công suất, bảo hành, xuất xứ..."
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isMainEquipment}
                  onChange={(event) => patchForm({ isMainEquipment: event.target.checked })}
                  className="size-4"
                />
                Thiết bị chính
              </label>
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => patchForm({ isActive: event.target.checked })}
                  className="size-4"
                />
                Đang sử dụng
              </label>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="price-note" className="text-xs">Ghi chú nội bộ</Label>
              <Textarea
                id="price-note"
                rows={2}
                value={form.note ?? ''}
                onChange={(event) => patchForm({ note: event.target.value })}
                placeholder="Ghi chú nguồn giá, điều kiện áp dụng..."
              />
            </div>

            {formError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="button" onClick={submitForm} disabled={isPending}>
              {isPending ? 'Đang lưu...' : 'Lưu bảng giá'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
