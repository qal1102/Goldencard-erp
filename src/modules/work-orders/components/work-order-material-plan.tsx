'use client';

import { PencilIcon, PlusIcon, RotateCcwIcon, SaveIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const emptyDraft: MaterialDraft = {
  itemId: '',
  plannedQuantity: '',
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
  const [draft, setDraft] = useState<MaterialDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const activeMaterials = useMemo(
    () => (materials ?? []).filter((row) => row.status !== 'cancelled'),
    [materials],
  );

  const selectedItem = itemOptions?.find((item) => item.id === draft.itemId);
  const isSubmitting = createMaterial.isPending || updateMaterial.isPending;
  const hasDraft = Boolean(draft.itemId || draft.plannedQuantity || draft.note);

  function updateDraft<K extends keyof MaterialDraft>(key: K, value: MaterialDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setDraft(emptyDraft);
    setEditingId(null);
    setFormError(null);
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
                    <div className="flex gap-1">
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
      </CardContent>
    </Card>
  );
}
