'use client';

import { PencilIcon, PlusIcon, RotateCcwIcon, SaveIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useCancelWorkOrderMaterial,
  useCreateWorkOrderMaterial,
  useReleaseWorkOrderMaterialReservation,
  useReserveWorkOrderMaterial,
  useWorkOrderMaterialStockOptions,
  useUpdateWorkOrderMaterial,
  useWorkOrderMaterialItemOptions,
  useWorkOrderMaterials,
} from '../hooks/use-work-orders';
import {
  WORK_ORDER_MATERIAL_STATUS_LABELS,
  type WorkOrderMaterialStatus,
} from '../schema/work-order-material.schema';

type Props = {
  workOrderId: string;
  canWrite: boolean;
};

type MaterialDraft = {
  itemId: string;
  plannedQuantity: string;
  note: string;
};

type ReservationDialogMode = 'reserve' | 'release';

type ReservationDraft = {
  warehouseId: string;
  quantity: string;
  note: string;
};

const emptyDraft: MaterialDraft = {
  itemId: '',
  plannedQuantity: '',
  note: '',
};

const emptyReservationDraft: ReservationDraft = {
  warehouseId: '',
  quantity: '',
  note: '',
};

function formatQuantity(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

function MaterialStatusBadge({ status }: { status: string }) {
  const typed = status as WorkOrderMaterialStatus;
  const label = WORK_ORDER_MATERIAL_STATUS_LABELS[typed] ?? status;
  const variant =
    status === 'cancelled'
      ? 'outline'
      : status === 'issued'
        ? 'secondary'
        : status === 'approved'
          ? 'secondary'
          : 'default';

  return <Badge variant={variant}>{label}</Badge>;
}

export function WorkOrderMaterialPlan({ workOrderId, canWrite }: Props) {
  const { data: materials, isLoading, isError, error, refetch } = useWorkOrderMaterials(workOrderId);
  const { data: itemOptions } = useWorkOrderMaterialItemOptions(canWrite);
  const createMaterial = useCreateWorkOrderMaterial(workOrderId);
  const updateMaterial = useUpdateWorkOrderMaterial(workOrderId);
  const cancelMaterial = useCancelWorkOrderMaterial(workOrderId);
  const reserveMaterial = useReserveWorkOrderMaterial(workOrderId);
  const releaseReservation = useReleaseWorkOrderMaterialReservation(workOrderId);
  const [draft, setDraft] = useState<MaterialDraft>(emptyDraft);
  const [reservationDraft, setReservationDraft] = useState<ReservationDraft>(
    emptyReservationDraft,
  );
  const [reservationMode, setReservationMode] = useState<ReservationDialogMode>('reserve');
  const [reservationMaterial, setReservationMaterial] = useState<
    NonNullable<typeof materials>[number] | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const { data: stockOptions, isFetching: isLoadingStockOptions } =
    useWorkOrderMaterialStockOptions(reservationMaterial?.itemId ?? null, Boolean(reservationMaterial));

  const activeMaterials = useMemo(
    () => (materials ?? []).filter((row) => row.status !== 'cancelled'),
    [materials],
  );

  const selectedItem = itemOptions?.find((item) => item.id === draft.itemId);
  const isSubmitting = createMaterial.isPending || updateMaterial.isPending;
  const isReservationSubmitting = reserveMaterial.isPending || releaseReservation.isPending;
  const hasDraft = Boolean(draft.itemId || draft.plannedQuantity || draft.note);
  const selectedStockOption = stockOptions?.find(
    (option) => option.warehouseId === reservationDraft.warehouseId,
  );

  function updateDraft<K extends keyof MaterialDraft>(key: K, value: MaterialDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setDraft(emptyDraft);
    setEditingId(null);
    setFormError(null);
  }

  function updateReservationDraft<K extends keyof ReservationDraft>(
    key: K,
    value: ReservationDraft[K],
  ) {
    setReservationDraft((prev) => ({ ...prev, [key]: value }));
  }

  function openReservationDialog(
    mode: ReservationDialogMode,
    row: NonNullable<typeof materials>[number],
  ) {
    setReservationMode(mode);
    setReservationMaterial(row);
    setReservationDraft(emptyReservationDraft);
    setReservationError(null);
  }

  function closeReservationDialog() {
    setReservationMaterial(null);
    setReservationDraft(emptyReservationDraft);
    setReservationError(null);
  }

  async function submitForm() {
    setFormError(null);
    const quantity = Number(draft.plannedQuantity);
    if (!editingId && !draft.itemId) {
      setFormError('Vui lòng chọn vật tư');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Số lượng dự trù phải lớn hơn 0');
      return;
    }

    const result = editingId
      ? await updateMaterial.mutateAsync({
          materialId: editingId,
          input: { plannedQuantity: quantity, note: draft.note },
        })
      : await createMaterial.mutateAsync({
          itemId: draft.itemId,
          plannedQuantity: quantity,
          note: draft.note,
        });

    if (result.success) resetForm();
    else setFormError(result.error);
  }

  function startEdit(row: NonNullable<typeof materials>[number]) {
    setEditingId(row.id);
    setDraft({
      itemId: row.itemId,
      plannedQuantity: String(Number(row.plannedQuantity)),
      note: row.note ?? '',
    });
    setFormError(null);
  }

  async function handleCancelMaterial(materialId: string) {
    setFormError(null);
    const result = await cancelMaterial.mutateAsync(materialId);
    if (!result.success) setFormError(result.error);
  }

  async function submitReservation() {
    if (!reservationMaterial) return;

    setReservationError(null);
    const quantity = Number(reservationDraft.quantity);
    if (!reservationDraft.warehouseId) {
      setReservationError('Vui lòng chọn kho');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setReservationError('Số lượng phải lớn hơn 0');
      return;
    }

    const input = {
      warehouseId: reservationDraft.warehouseId,
      quantity,
      note: reservationDraft.note,
    };

    const result =
      reservationMode === 'reserve'
        ? await reserveMaterial.mutateAsync({
            materialId: reservationMaterial.id,
            input,
          })
        : await releaseReservation.mutateAsync({
            materialId: reservationMaterial.id,
            input,
          });

    if (result.success) closeReservationDialog();
    else setReservationError(result.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-sm">
          <span>Vật tư dự trù</span>
          <span className="text-xs font-normal text-muted-foreground">
            {activeMaterials.length} dòng đang dùng
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
          Dự trù là nhu cầu vật tư của lệnh thi công. Giữ vật tư sẽ khóa một phần tồn
          khả dụng trong kho để tránh đội khác xuất nhầm; xuất kho thật vẫn thực hiện ở
          module Kho.
        </p>

        {canWrite && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <div className="flex flex-col gap-1.5">
                <Label>Vật tư</Label>
                <Select
                  value={draft.itemId}
                  onValueChange={(value) => updateDraft('itemId', value ?? '')}
                  disabled={Boolean(editingId) || isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn mã vật tư">
                      {(value) => {
                        const item = itemOptions?.find((entry) => entry.id === value);
                        return item ? `${item.sku} - ${item.name}` : null;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(itemOptions ?? []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.sku} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="work-order-material-quantity">
                  Số lượng{selectedItem?.unit ? ` (${selectedItem.unit})` : ''}
                </Label>
                <Input
                  id="work-order-material-quantity"
                  type="number"
                  min="0"
                  step="0.001"
                  value={draft.plannedQuantity}
                  onChange={(event) => updateDraft('plannedQuantity', event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <Label htmlFor="work-order-material-note">Ghi chú</Label>
              <Textarea
                id="work-order-material-note"
                value={draft.note}
                onChange={(event) => updateDraft('note', event.target.value)}
                rows={2}
                placeholder="Ví dụ: dùng cho mái phụ, cần kiểm tra tại công trình..."
                disabled={isSubmitting}
              />
            </div>

            {formError && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-sm text-destructive">
                {formError}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={isSubmitting} onClick={submitForm}>
                {editingId ? <SaveIcon className="size-4" /> : <PlusIcon className="size-4" />}
                {editingId ? 'Lưu vật tư' : 'Thêm vật tư'}
              </Button>
              {(editingId || hasDraft) && (
                <Button size="sm" variant="outline" disabled={isSubmitting} onClick={resetForm}>
                  <XIcon className="size-4" />
                  Hủy nhập
                </Button>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p>{error instanceof Error ? error.message : 'Không thể tải vật tư dự trù'}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => void refetch()}>
              Thử lại
            </Button>
          </div>
        )}

        {!isLoading && !isError && (materials ?? []).length === 0 && (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Chưa có vật tư dự trù cho lệnh thi công này.
          </p>
        )}

        {!isLoading && !isError && (materials ?? []).length > 0 && (
          <div className="flex flex-col gap-2">
            {(materials ?? []).map((row) => (
              <div
                key={row.id}
                className="rounded-lg border p-3 data-[cancelled=true]:bg-muted/40"
                data-cancelled={row.status === 'cancelled'}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium">{row.itemSku}</span>
                      <MaterialStatusBadge status={row.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium">{row.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.itemCategory ?? 'Chưa phân nhóm'} · Đơn vị: {row.itemUnit}
                    </p>
                  </div>

                  {canWrite && row.status !== 'cancelled' && row.status !== 'issued' && (
                    <div className="flex flex-wrap gap-1">
                      {Number(row.plannedQuantity) - Number(row.reservedQuantity) - Number(row.issuedQuantity) > 0 && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={isSubmitting || isReservationSubmitting}
                          onClick={() => openReservationDialog('reserve', row)}
                        >
                          Giữ vật tư
                        </Button>
                      )}
                      {Number(row.reservedQuantity) > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          disabled={isSubmitting || isReservationSubmitting}
                          onClick={() => openReservationDialog('release', row)}
                        >
                          Hủy giữ
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting || cancelMaterial.isPending}
                        onClick={() => startEdit(row)}
                      >
                        <PencilIcon className="size-4" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting || cancelMaterial.isPending}
                        onClick={() => handleCancelMaterial(row.id)}
                      >
                        <RotateCcwIcon className="size-4" />
                        Hủy dòng
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Dự trù</Label>
                    <p className="font-medium">
                      {formatQuantity(row.plannedQuantity)} {row.itemUnit}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Đã giữ</Label>
                    <p className="font-medium">
                      {formatQuantity(row.reservedQuantity)} {row.itemUnit}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Đã xuất</Label>
                    <p className="font-medium">
                      {formatQuantity(row.issuedQuantity)} {row.itemUnit}
                    </p>
                  </div>
                </div>

                {row.note && <p className="mt-2 text-sm text-muted-foreground">{row.note}</p>}
              </div>
            ))}
          </div>
        )}

        <Dialog open={Boolean(reservationMaterial)} onOpenChange={(open) => {
          if (!open) closeReservationDialog();
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {reservationMode === 'reserve' ? 'Giữ vật tư cho công trình' : 'Hủy giữ vật tư'}
              </DialogTitle>
              <DialogDescription>
                {reservationMaterial
                  ? `${reservationMaterial.itemSku} - ${reservationMaterial.itemName}`
                  : 'Chọn kho và số lượng cần thao tác.'}
              </DialogDescription>
            </DialogHeader>

            {reservationError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {reservationError}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Kho</Label>
              <Select
                value={reservationDraft.warehouseId}
                onValueChange={(value) => updateReservationDraft('warehouseId', value ?? '')}
                disabled={isReservationSubmitting || isLoadingStockOptions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingStockOptions ? 'Đang tải kho...' : 'Chọn kho'} />
                </SelectTrigger>
                <SelectContent>
                  {(stockOptions ?? []).map((option) => (
                    <SelectItem key={option.warehouseId} value={option.warehouseId}>
                      {option.warehouseName} - khả dụng {formatQuantity(option.quantityAvailable)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStockOption && (
              <div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Tồn thực tế</span>
                  <p className="font-medium">{formatQuantity(selectedStockOption.quantityOnHand)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Đã giữ</span>
                  <p className="font-medium">{formatQuantity(selectedStockOption.quantityReserved)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Khả dụng</span>
                  <p className="font-medium">{formatQuantity(selectedStockOption.quantityAvailable)}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservation-quantity">Số lượng</Label>
              <Input
                id="reservation-quantity"
                type="number"
                min="0.001"
                step="0.001"
                value={reservationDraft.quantity}
                onChange={(event) => updateReservationDraft('quantity', event.target.value)}
                disabled={isReservationSubmitting}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservation-note">Ghi chú</Label>
              <Textarea
                id="reservation-note"
                value={reservationDraft.note}
                onChange={(event) => updateReservationDraft('note', event.target.value)}
                rows={2}
                placeholder="VD: giữ cho đội thi công trước ngày lắp"
                disabled={isReservationSubmitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isReservationSubmitting}
                onClick={closeReservationDialog}
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={isReservationSubmitting}
                onClick={() => void submitReservation()}
              >
                {isReservationSubmitting
                  ? 'Đang lưu...'
                  : reservationMode === 'reserve'
                    ? 'Giữ vật tư'
                    : 'Hủy giữ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
