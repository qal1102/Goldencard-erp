'use client';

import { ExternalLinkIcon, FileTextIcon, PrinterIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BackButton } from '@/components/navigation/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TRANSITIONS,
  type ContractStatus,
} from '../schema/contract.schema';
import {
  useCreateWorkOrderFromContract,
  useWorkOrderByContract,
} from '@/modules/work-orders/hooks/use-work-orders';
import {
  useContract,
  useUpdateContractInfo,
  useUpdateContractStatus,
} from '../hooks/use-contracts';
import { ContractStatusBadge } from './contract-status-badge';

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

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

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
}

function SignedDocumentDisplay({ value }: { value: string }) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isLikelyUrl(trimmed)) {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        {trimmed}
        <ExternalLinkIcon className="size-3.5 shrink-0" />
      </a>
    );
  }
  return <span className="text-sm">{trimmed}</span>;
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
  contractId: string;
  canWrite: boolean;
  canApprove: boolean;
};

export function ContractDetail({ contractId, canWrite, canApprove }: Props) {
  const { data, isLoading } = useContract(contractId);
  const updateStatus = useUpdateContractStatus(contractId);
  const updateInfo = useUpdateContractInfo(contractId);
  const { data: linkedWorkOrder } = useWorkOrderByContract(
    contractId,
    Boolean(data?.contract?.status === 'signed'),
  );
  const createWorkOrder = useCreateWorkOrderFromContract();
  const [error, setError] = useState<string | null>(null);

  type InfoDraft = {
    customerSignerName: string;
    goldenCardSignerName: string;
    signedDocumentUrl: string;
    note: string;
  };
  const [infoDraft, setInfoDraft] = useState<InfoDraft | null>(null);

  const contract = data?.contract;
  const auditLogs = data?.auditLogs ?? [];

  const savedInfo: InfoDraft = {
    customerSignerName: contract?.customerSignerName ?? '',
    goldenCardSignerName: contract?.goldenCardSignerName ?? '',
    signedDocumentUrl: contract?.signedDocumentUrl ?? '',
    note: contract?.note ?? '',
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

  if (!contract) {
    return (
      <div className="py-16 text-center text-muted-foreground">Không tìm thấy hợp đồng</div>
    );
  }

  const status = contract.status as ContractStatus;
  const allowedTransitions = CONTRACT_STATUS_TRANSITIONS[status] ?? [];
  const canEditInfo = canWrite && status !== 'cancelled';
  const quotation = contract.quotation;

  async function handleStatus(next: ContractStatus) {
    setError(null);
    if (next === 'signed') {
      const hasDoc = Boolean(infoValues.signedDocumentUrl.trim());
      if (
        !hasDoc &&
        !window.confirm(
          'Chưa có link/file hợp đồng đã ký. Bạn vẫn muốn đánh dấu đã ký?',
        )
      ) {
        return;
      }
    }
    const result = await updateStatus.mutateAsync({ status: next });
    if (!result.success) setError(result.error);
  }

  async function handleCreateWorkOrder() {
    setError(null);
    const result = await createWorkOrder.mutateAsync({ contractId });
    if (!result.success) setError(result.error);
  }

  async function handleSaveInfo() {
    setError(null);
    const result = await updateInfo.mutateAsync(infoValues);
    if (result.success) setInfoDraft(null);
    else setError(result.error);
  }

  function updateInfoField<K extends keyof InfoDraft>(key: K, value: InfoDraft[K]) {
    setInfoDraft((prev) => ({ ...(prev ?? savedInfo), [key]: value }));
  }

  const vatRate = quotation?.vatRate ? parseFloat(quotation.vatRate) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/contracts" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold">{contract.code}</h1>
            <ContractStatusBadge status={status} />
          </div>
          {contract.customer && (
            <Link
              href={`/crm/customers/${contract.customer.id}`}
              className="mt-1 block text-sm font-medium text-primary hover:underline"
            >
              {contract.customer.fullName}
            </Link>
          )}
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatCurrency(contract.contractValue)}
          </p>
          {status === 'signed' && contract.signedAt && (
            <p className="text-xs text-muted-foreground">
              Ngày ký: {formatDate(contract.signedAt)}
            </p>
          )}
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/contracts/${contractId}/print`} />}
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

      {(canWrite || canApprove) && (allowedTransitions.length > 0 || status === 'signed') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Thao tác</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.includes('prepared') && canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus('prepared')}
                >
                  Chuyển sang chờ ký
                </Button>
              )}
              {allowedTransitions.includes('signed') && canApprove && (
                <Button
                  size="sm"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus('signed')}
                >
                  Đánh dấu đã ký
                </Button>
              )}
              {allowedTransitions.includes('cancelled') && (canWrite || canApprove) && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus('cancelled')}
                >
                  Hủy hợp đồng
                </Button>
              )}
            </div>
            {status === 'signed' && canWrite && !linkedWorkOrder && (
              <Button
                size="sm"
                disabled={createWorkOrder.isPending}
                onClick={handleCreateWorkOrder}
              >
                Tạo lệnh thi công
              </Button>
            )}
            {status === 'signed' && linkedWorkOrder && (
              <Button size="sm" variant="outline" render={<Link href={`/work-orders/${linkedWorkOrder.id}`} />}>
                Xem lệnh thi công ({linkedWorkOrder.code})
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <FileTextIcon className="size-3.5" />
            Nguồn hợp đồng / Liên kết dự án
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {contract.lead ? (
            <div>
              <Label className="text-xs text-muted-foreground">Cơ hội</Label>
              <Link
                href={`/crm/leads/${contract.lead.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {contract.lead.code}
              </Link>
              <span className="text-muted-foreground"> · {contract.lead.fullName}</span>
            </div>
          ) : null}
          {contract.survey ? (
            <div>
              <Label className="text-xs text-muted-foreground">Phiếu khảo sát</Label>
              <Link
                href={`/surveys/${contract.survey.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {contract.survey.code}
              </Link>
            </div>
          ) : null}
          {quotation ? (
            <div>
              <Label className="text-xs text-muted-foreground">Báo giá gốc</Label>
              <p className="text-sm">
                Tạo từ báo giá:{' '}
                <Link
                  href={`/quotations/${quotation.id}`}
                  className="font-mono text-primary hover:underline"
                >
                  {quotation.code}
                  {quotation.revisionNumber != null && (
                    <span className="text-muted-foreground">
                      {' '}
                      · v{quotation.revisionNumber}
                    </span>
                  )}
                </Link>
              </p>
            </div>
          ) : null}
          {contract.customer ? (
            <div>
              <Label className="text-xs text-muted-foreground">Khách hàng</Label>
              <Link
                href={`/crm/customers/${contract.customer.id}`}
                className="block font-medium text-primary hover:underline"
              >
                {contract.customer.fullName} ({contract.customer.code})
              </Link>
              <DetailRow label="Điện thoại" value={contract.customer.phone} />
              <DetailRow label="Địa chỉ" value={contract.customer.address} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Giá trị hợp đồng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between font-semibold">
            <span>Giá trị hợp đồng</span>
            <span className="tabular-nums">{formatCurrency(contract.contractValue)}</span>
          </div>
          {quotation && (
            <div className="flex justify-between text-muted-foreground">
              <span>Giá trị từ báo giá đã chấp nhận</span>
              <span className="tabular-nums">{formatCurrency(quotation.grandTotal)}</span>
            </div>
          )}
          {quotation &&
            (parseFloat(quotation.discountAmount ?? '0') > 0 ||
              parseFloat(quotation.taxAmount ?? '0') > 0) && (
              <div className="mt-1 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span className="tabular-nums">{formatCurrency(quotation.subtotal)}</span>
                </div>
                {parseFloat(quotation.discountAmount ?? '0') > 0 && (
                  <div className="flex justify-between">
                    <span>Giảm giá</span>
                    <span className="tabular-nums">
                      −{formatCurrency(quotation.discountAmount)}
                    </span>
                  </div>
                )}
                {parseFloat(quotation.taxAmount ?? '0') > 0 && (
                  <div className="flex justify-between">
                    <span>VAT{vatRate != null && !isNaN(vatRate) ? ` (${vatRate}%)` : ''}</span>
                    <span className="tabular-nums">{formatCurrency(quotation.taxAmount)}</span>
                  </div>
                )}
              </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin ký &amp; hồ sơ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {canEditInfo ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customerSignerName">Người ký phía khách</Label>
                <Input
                  id="customerSignerName"
                  value={infoValues.customerSignerName}
                  onChange={(e) => updateInfoField('customerSignerName', e.target.value)}
                  placeholder="Họ tên người đại diện khách hàng"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goldenCardSignerName">Người đại diện GoldenCard</Label>
                <Input
                  id="goldenCardSignerName"
                  value={infoValues.goldenCardSignerName}
                  onChange={(e) => updateInfoField('goldenCardSignerName', e.target.value)}
                  placeholder="Họ tên người ký phía GoldenCard"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="signedDocumentUrl">Link hợp đồng đã ký / file scan</Label>
                <Input
                  id="signedDocumentUrl"
                  value={infoValues.signedDocumentUrl}
                  onChange={(e) => updateInfoField('signedDocumentUrl', e.target.value)}
                  placeholder="https://... hoặc ghi chú vị trí file"
                />
                {infoValues.signedDocumentUrl.trim() && !infoDirty && (
                  <SignedDocumentDisplay value={infoValues.signedDocumentUrl} />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contractNote">Ghi chú hợp đồng</Label>
                <Textarea
                  id="contractNote"
                  value={infoValues.note}
                  onChange={(e) => updateInfoField('note', e.target.value)}
                  rows={3}
                  placeholder="Ghi chú thanh toán, điều khoản, lưu ý nội bộ..."
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={!infoDirty || updateInfo.isPending}
                onClick={handleSaveInfo}
              >
                Lưu thông tin
              </Button>
            </>
          ) : (
            <>
              <DetailRow label="Người ký phía khách" value={contract.customerSignerName} />
              <DetailRow
                label="Người đại diện GoldenCard"
                value={contract.goldenCardSignerName}
              />
              {contract.signedDocumentUrl ? (
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs text-muted-foreground">
                    Link hợp đồng đã ký / file scan
                  </Label>
                  <SignedDocumentDisplay value={contract.signedDocumentUrl} />
                </div>
              ) : null}
              <DetailRow label="Ghi chú hợp đồng" value={contract.note ?? '—'} />
            </>
          )}
          {status === 'signed' && (
            <>
              <DetailRow label="Ngày ký" value={formatDate(contract.signedAt)} />
              <DetailRow label="Ghi nhận bởi" value={contract.signedByUser?.name} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DetailRow label="Trạng thái" value={CONTRACT_STATUS_LABELS[status]} />
          <DetailRow label="Tạo bởi" value={contract.createdByUser?.name} />
          <DetailRow label="Tạo lúc" value={formatDateTime(contract.createdAt)} />
        </CardContent>
      </Card>

      {auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lịch sử</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {auditLogs.map((log) => (
              <div
                key={String(log.id)}
                className="flex flex-col gap-0.5 border-b pb-2 last:border-0 last:pb-0"
              >
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                  {log.userName ? ` · ${log.userName}` : ''}
                </span>
                <p className="text-sm">{log.summary ?? log.action}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
