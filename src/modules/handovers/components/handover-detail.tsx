'use client';

import Link from 'next/link';
import { PrinterIcon } from 'lucide-react';
import { useState } from 'react';
import { DocumentLinksList } from '@/components/document-links-list';
import { BackButton } from '@/components/navigation/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUS_TRANSITIONS,
  type HandoverStatus,
} from '../schema/handover.schema';
import {
  useHandover,
  useUpdateHandoverInfo,
  useUpdateHandoverStatus,
} from '../hooks/use-handovers';
import { HandoverCertificateSection } from '@/modules/warranty-certificates/components/handover-certificate-section';
import { HandoverWarrantySection } from '@/modules/warranty-tickets/components/handover-warranty-section';
import { HandoverStatusBadge } from './handover-status-badge';

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
  handoverId: string;
  canWrite: boolean;
  canCreateWarranty?: boolean;
};

export function HandoverDetail({ handoverId, canWrite, canCreateWarranty = false }: Props) {
  const { data: handover, isLoading } = useHandover(handoverId);
  const updateStatus = useUpdateHandoverStatus(handoverId);
  const updateInfo = useUpdateHandoverInfo(handoverId);
  const [error, setError] = useState<string | null>(null);

  type InfoDraft = {
    customerReceiverName: string;
    documentLinks: string;
    note: string;
    handoverAt: string;
  };
  const [infoDraft, setInfoDraft] = useState<InfoDraft | null>(null);

  const savedInfo: InfoDraft = {
    customerReceiverName: handover?.customerReceiverName ?? '',
    documentLinks: handover?.documentLinks ?? '',
    note: handover?.note ?? '',
    handoverAt: formatDateInput(handover?.handoverAt),
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

  if (!handover) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Không tìm thấy phiếu bàn giao
      </div>
    );
  }

  const status = handover.status as HandoverStatus;
  const allowedTransitions = HANDOVER_STATUS_TRANSITIONS[status] ?? [];
  const canEditInfo = canWrite && status !== 'cancelled' && status !== 'completed';

  async function handleStatus(next: HandoverStatus) {
    setError(null);
    const result = await updateStatus.mutateAsync({ status: next });
    if (!result.success) setError(result.error);
  }

  async function handleSaveInfo() {
    setError(null);
    const result = await updateInfo.mutateAsync({
      customerReceiverName: infoValues.customerReceiverName || null,
      documentLinks: infoValues.documentLinks || null,
      note: infoValues.note || null,
      handoverAt: parseDateInput(infoValues.handoverAt),
    });
    if (result.success) setInfoDraft(null);
    else setError(result.error);
  }

  function updateInfoField<K extends keyof InfoDraft>(key: K, value: InfoDraft[K]) {
    setInfoDraft((prev) => ({ ...(prev ?? savedInfo), [key]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/handovers" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold">{handover.code}</h1>
            <HandoverStatusBadge status={status} />
          </div>
          {handover.customer && (
            <Link
              href={`/crm/customers/${handover.customer.id}`}
              className="mt-1 block text-sm font-medium text-primary hover:underline"
            >
              {handover.customer.fullName}
            </Link>
          )}
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/handovers/${handoverId}/print`} />}
            >
              <PrinterIcon className="size-3.5" />
              In / Lưu PDF
            </Button>
          </div>
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
            {allowedTransitions.includes('pending_customer') && (
              <Button
                size="sm"
                variant="outline"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('pending_customer')}
              >
                Chờ khách xác nhận
              </Button>
            )}
            {allowedTransitions.includes('completed') && (
              <Button
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('completed')}
              >
                Đã bàn giao
              </Button>
            )}
            {allowedTransitions.includes('cancelled') && (
              <Button
                size="sm"
                variant="destructive"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('cancelled')}
              >
                Hủy phiếu bàn giao
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
          {handover.lead ? (
            <div>
              <Label className="text-xs text-muted-foreground">Cơ hội</Label>
              <Link
                href={`/crm/leads/${handover.lead.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {handover.lead.code}
              </Link>
              <span className="text-muted-foreground"> · {handover.lead.fullName}</span>
            </div>
          ) : null}
          {handover.survey ? (
            <div>
              <Label className="text-xs text-muted-foreground">Phiếu khảo sát</Label>
              <Link
                href={`/surveys/${handover.survey.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {handover.survey.code}
              </Link>
            </div>
          ) : null}
          {handover.quotation ? (
            <div>
              <Label className="text-xs text-muted-foreground">Báo giá</Label>
              <Link
                href={`/quotations/${handover.quotation.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {handover.quotation.code}
              </Link>
            </div>
          ) : null}
          {handover.contract ? (
            <div>
              <Label className="text-xs text-muted-foreground">Hợp đồng</Label>
              <Link
                href={`/contracts/${handover.contract.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {handover.contract.code}
              </Link>
            </div>
          ) : null}
          {handover.workOrder ? (
            <div>
              <Label className="text-xs text-muted-foreground">Lệnh thi công</Label>
              <Link
                href={`/work-orders/${handover.workOrder.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {handover.workOrder.code}
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <HandoverCertificateSection
        handoverId={handoverId}
        canWrite={canCreateWarranty}
        showCreate={status === 'completed'}
      />

      <HandoverWarrantySection
        handoverId={handoverId}
        canWrite={canCreateWarranty}
        showCreate={status === 'completed'}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin bàn giao</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {canEditInfo ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customerReceiverName">Người nhận bàn giao (khách)</Label>
                <Input
                  id="customerReceiverName"
                  value={infoValues.customerReceiverName}
                  onChange={(e) => updateInfoField('customerReceiverName', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="handoverAt">Ngày bàn giao</Label>
                <Input
                  id="handoverAt"
                  type="date"
                  value={infoValues.handoverAt}
                  onChange={(e) => updateInfoField('handoverAt', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="documentLinks">Link ảnh/tài liệu bàn giao</Label>
                <Textarea
                  id="documentLinks"
                  value={infoValues.documentLinks}
                  onChange={(e) => updateInfoField('documentLinks', e.target.value)}
                  rows={4}
                  placeholder="Mỗi dòng một link (Google Drive, Google Photos, Zalo album, OneDrive…)"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="handoverNote">Ghi chú</Label>
                <Textarea
                  id="handoverNote"
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
                Lưu thông tin bàn giao
              </Button>
            </>
          ) : (
            <>
              <DetailRow
                label="Người nhận bàn giao (khách)"
                value={handover.customerReceiverName ?? '—'}
              />
              <DetailRow label="Ngày bàn giao" value={formatDateTime(handover.handoverAt) ?? '—'} />
              <DetailRow
                label="Người bàn giao"
                value={handover.handedOverByUser?.name ?? '—'}
              />
              <div className="flex flex-col gap-0.5">
                <Label className="text-xs text-muted-foreground">Link ảnh/tài liệu bàn giao</Label>
                <DocumentLinksList value={handover.documentLinks} />
              </div>
              <DetailRow label="Ghi chú" value={handover.note ?? '—'} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DetailRow label="Trạng thái" value={HANDOVER_STATUS_LABELS[status]} />
          <DetailRow label="Tạo bởi" value={handover.createdByUser?.name} />
          <DetailRow label="Tạo lúc" value={formatDateTime(handover.createdAt)} />
        </CardContent>
      </Card>
    </div>
  );
}
