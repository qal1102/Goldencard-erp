'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DocumentLinksList } from '@/components/document-links-list';
import { MapLinkButton } from '@/components/address/map-link-button';
import { BackButton } from '@/components/navigation/back-button';
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
import { UserSelectOption } from '@/components/users/user-select-option';
import { useCreateHandoverFromWorkOrder } from '@/modules/handovers/hooks/use-handovers';
import { displayQuotationCode } from '@/modules/quotations/lib/quotation-display';
import { useTechnicianUsers } from '@/modules/surveys/hooks/use-surveys';
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TRANSITIONS,
  type WorkOrderStatus,
} from '../schema/work-order.schema';
import {
  useCompleteWorkOrder,
  useUpdateWorkOrderInfo,
  useUpdateWorkOrderStatus,
  useWorkOrder,
} from '../hooks/use-work-orders';
import { WorkOrderMaterialPlan } from './work-order-material-plan';
import { WorkOrderStatusBadge } from './work-order-status-badge';

function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInput(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{String(value)}</span>
    </div>
  );
}

type Props = {
  workOrderId: string;
  canWrite: boolean;
  canManageMaterials: boolean;
};

export function WorkOrderDetail({ workOrderId, canWrite, canManageMaterials }: Props) {
  const { data: workOrder, isLoading } = useWorkOrder(workOrderId);
  const updateStatus = useUpdateWorkOrderStatus(workOrderId);
  const completeWorkOrder = useCompleteWorkOrder(workOrderId);
  const updateInfo = useUpdateWorkOrderInfo(workOrderId);
  const createHandover = useCreateHandoverFromWorkOrder();
  const { data: technicians } = useTechnicianUsers();
  const [error, setError] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [completionDocumentLinks, setCompletionDocumentLinks] = useState('');

  type InfoDraft = {
    assignedTo: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    note: string;
  };
  const [infoDraft, setInfoDraft] = useState<InfoDraft | null>(null);

  const savedInfo: InfoDraft = {
    assignedTo: workOrder?.assignedTo ?? '',
    scheduledStartAt: formatDateInput(workOrder?.scheduledStartAt),
    scheduledEndAt: formatDateInput(workOrder?.scheduledEndAt),
    note: workOrder?.note ?? '',
  };
  const infoValues = infoDraft ?? savedInfo;
  const infoDirty = infoDraft !== null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Không tìm thấy lệnh thi công
      </div>
    );
  }

  const status = workOrder.status as WorkOrderStatus;
  const allowedTransitions = WORK_ORDER_STATUS_TRANSITIONS[status] ?? [];
  const canEditInfo = canWrite && status !== 'cancelled' && status !== 'completed';
  const canEditMaterials =
    canManageMaterials && status !== 'cancelled' && status !== 'completed';

  async function handleStatus(next: WorkOrderStatus) {
    setError(null);
    const result = await updateStatus.mutateAsync({ status: next });
    if (!result.success) setError(result.error);
  }

  async function handleComplete() {
    setError(null);
    const result = await completeWorkOrder.mutateAsync({
      completionNote,
      completionDocumentLinks: completionDocumentLinks || null,
    });
    if (result.success) {
      setCompleteDialogOpen(false);
      setCompletionNote('');
      setCompletionDocumentLinks('');
    } else {
      setError(result.error);
    }
  }

  async function handleCreateHandover() {
    setError(null);
    const result = await createHandover.mutateAsync({ workOrderId });
    if (!result.success) setError(result.error);
  }

  async function handleSaveInfo() {
    setError(null);
    const result = await updateInfo.mutateAsync({
      assignedTo: infoValues.assignedTo || null,
      scheduledStartAt: parseDateInput(infoValues.scheduledStartAt),
      scheduledEndAt: parseDateInput(infoValues.scheduledEndAt),
      note: infoValues.note || null,
    });
    if (result.success) setInfoDraft(null);
    else setError(result.error);
  }

  function updateInfoField<K extends keyof InfoDraft>(key: K, value: InfoDraft[K]) {
    setInfoDraft((prev) => ({ ...(prev ?? savedInfo), [key]: value }));
  }

  const fullAddress = [workOrder.installationAddress, workOrder.province]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/work-orders" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold">{workOrder.code}</h1>
            <WorkOrderStatusBadge status={status} />
          </div>
          {workOrder.customer && (
            <Link
              href={`/crm/customers/${workOrder.customer.id}`}
              className="mt-1 block text-sm font-medium text-primary hover:underline"
            >
              {workOrder.customer.fullName}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {canWrite && allowedTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Thao tác</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allowedTransitions.includes('scheduled') && (
              <Button
                size="sm"
                variant="outline"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('scheduled')}
              >
                Đánh dấu đã lên lịch
              </Button>
            )}
            {allowedTransitions.includes('in_progress') && (
              <Button
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('in_progress')}
              >
                Bắt đầu thi công
              </Button>
            )}
            {allowedTransitions.includes('completed') && (
              <Button
                size="sm"
                disabled={completeWorkOrder.isPending}
                onClick={() => setCompleteDialogOpen(true)}
              >
                Hoàn thành thi công
              </Button>
            )}
            {allowedTransitions.includes('cancelled') && (
              <Button
                size="sm"
                variant="destructive"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('cancelled')}
              >
                Hủy lệnh thi công
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bằng chứng hoàn thành thi công</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <DetailRow label="Ghi chú hoàn thành" value={workOrder.completionNote ?? '—'} />
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs text-muted-foreground">Link ảnh/tài liệu thi công</Label>
              <DocumentLinksList value={workOrder.completionDocumentLinks} />
            </div>
            <DetailRow
              label="Người hoàn thành"
              value={workOrder.completedByUser?.name ?? '—'}
            />
            <DetailRow
              label="Thời gian hoàn thành"
              value={formatDateTime(workOrder.completedAt) ?? '—'}
            />
          </CardContent>
        </Card>
      )}

      {status === 'completed' && canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bàn giao</CardTitle>
          </CardHeader>
          <CardContent>
            {workOrder.handover ? (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={`/handovers/${workOrder.handover.id}`} />}
              >
                Xem phiếu bàn giao ({workOrder.handover.code})
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={createHandover.isPending}
                onClick={handleCreateHandover}
              >
                Tạo phiếu bàn giao
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Liên kết dự án</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {workOrder.lead ? (
            <div>
              <Label className="text-xs text-muted-foreground">Cơ hội</Label>
              <Link
                href={`/crm/leads/${workOrder.lead.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {workOrder.lead.code}
              </Link>
              <span className="text-muted-foreground"> · {workOrder.lead.fullName}</span>
            </div>
          ) : null}
          {workOrder.survey ? (
            <div>
              <Label className="text-xs text-muted-foreground">Phiếu khảo sát</Label>
              <Link
                href={`/surveys/${workOrder.survey.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {workOrder.survey.code}
              </Link>
            </div>
          ) : null}
          {workOrder.quotation ? (
            <div>
              <Label className="text-xs text-muted-foreground">Báo giá</Label>
              <Link
                href={`/quotations/${workOrder.quotation.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {displayQuotationCode(workOrder.quotation.code)}
              </Link>
            </div>
          ) : null}
          {workOrder.contract ? (
            <div>
              <Label className="text-xs text-muted-foreground">Hợp đồng</Label>
              <Link
                href={`/contracts/${workOrder.contract.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {workOrder.contract.code}
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Địa điểm thi công</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DetailRow label="Địa chỉ" value={workOrder.installationAddress} />
          <DetailRow label="Tỉnh/Thành" value={workOrder.province} />
          {fullAddress && (
            <MapLinkButton address={fullAddress} label="Xem bản đồ" className="self-start" />
          )}
        </CardContent>
      </Card>

      <WorkOrderMaterialPlan workOrderId={workOrderId} canWrite={canEditMaterials} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Phân công &amp; lịch</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {canEditInfo ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Người/đội thi công phụ trách</Label>
                <Select
                  value={infoValues.assignedTo || '__none__'}
                  onValueChange={(v) =>
                    updateInfoField('assignedTo', !v || v === '__none__' ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chưa phân công">
                      {(value) => {
                        if (!value || value === '__none__') return 'Chưa phân công';
                        const tech = technicians?.find((t) => t.id === value);
                        return tech ? tech.name : 'Chưa phân công';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Chưa phân công</SelectItem>
                    {(technicians ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <UserSelectOption user={t} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheduledStartAt">Ngày bắt đầu dự kiến</Label>
                <Input
                  id="scheduledStartAt"
                  type="date"
                  value={infoValues.scheduledStartAt}
                  onChange={(e) => updateInfoField('scheduledStartAt', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheduledEndAt">Ngày kết thúc dự kiến</Label>
                <Input
                  id="scheduledEndAt"
                  type="date"
                  value={infoValues.scheduledEndAt}
                  onChange={(e) => updateInfoField('scheduledEndAt', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workOrderNote">Ghi chú</Label>
                <Textarea
                  id="workOrderNote"
                  value={infoValues.note}
                  onChange={(e) => updateInfoField('note', e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={!infoDirty || updateInfo.isPending}
                onClick={handleSaveInfo}
              >
                Lưu phân công &amp; lịch
              </Button>
            </>
          ) : (
            <>
              <DetailRow
                label="Người/đội thi công phụ trách"
                value={workOrder.assignedUser?.name ?? '—'}
              />
              <DetailRow
                label="Bắt đầu dự kiến"
                value={
                  workOrder.scheduledStartAt
                    ? formatDateTime(workOrder.scheduledStartAt)?.split(',')[0]
                    : '—'
                }
              />
              <DetailRow
                label="Kết thúc dự kiến"
                value={
                  workOrder.scheduledEndAt
                    ? formatDateTime(workOrder.scheduledEndAt)?.split(',')[0]
                    : '—'
                }
              />
              <DetailRow label="Ghi chú" value={workOrder.note ?? '—'} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DetailRow label="Trạng thái" value={WORK_ORDER_STATUS_LABELS[status]} />
          <DetailRow label="Tạo bởi" value={workOrder.createdByUser?.name} />
          <DetailRow label="Tạo lúc" value={formatDateTime(workOrder.createdAt)} />
        </CardContent>
      </Card>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hoàn thành thi công</DialogTitle>
            <DialogDescription>
              Ghi nhận bằng chứng hoàn thành trước khi đóng lệnh thi công.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="completionNote">Ghi chú hoàn thành *</Label>
              <Textarea
                id="completionNote"
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                rows={3}
                placeholder="Mô tả ngắn kết quả thi công, hiện trạng bàn giao…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="completionDocumentLinks">Link ảnh/tài liệu thi công</Label>
              <Textarea
                id="completionDocumentLinks"
                value={completionDocumentLinks}
                onChange={(e) => setCompletionDocumentLinks(e.target.value)}
                rows={4}
                placeholder="Mỗi dòng một link (Google Drive, Google Photos, Zalo album, OneDrive…)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              disabled={!completionNote.trim() || completeWorkOrder.isPending}
              onClick={handleComplete}
            >
              Xác nhận hoàn thành
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
