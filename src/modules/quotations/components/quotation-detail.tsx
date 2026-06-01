'use client';

import {
  ArrowLeftIcon,
  CalendarIcon,
  EditIcon,
  FileTextIcon,
  UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { QuotationStatus } from '../schema/quotation.schema';
import { useQuotation } from '../hooks/use-quotations';
import { QuotationStatusBadge } from './quotation-status-badge';
import { QuotationWorkflowPanel } from './quotation-workflow-panel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{String(value)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  quotationId: string;
  canWrite: boolean;
  canApprove: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuotationDetail({ quotationId, canWrite, canApprove }: Props) {
  const { data: quotation, isLoading } = useQuotation(quotationId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Không tìm thấy báo giá
      </div>
    );
  }

  const status = quotation.status as QuotationStatus;
  const isDraft = status === 'draft';
  const isContentLocked = Boolean(quotation.contentLockedAt);
  const revisionNumber = quotation.revisionNumber ?? 1;
  const canEdit = isDraft && canWrite && !isContentLocked;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/quotations" />}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold">
              {quotation.code}
              <span className="text-muted-foreground"> · v{revisionNumber}</span>
            </p>
            <QuotationStatusBadge status={status} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {quotation.customerNameSnapshot}
          </p>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/quotations/${quotationId}/edit`} />}
          >
            <EditIcon className="size-3.5" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      <QuotationWorkflowPanel
        quotation={quotation}
        canWrite={canWrite}
        canApprove={canApprove}
      />

      {/* Customer snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <UserIcon className="size-3.5" />
            Khách hàng
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {quotation.customer ? (
            <Link
              href={`/crm/customers/${quotation.customer.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {quotation.customerNameSnapshot} ({quotation.customer.code})
            </Link>
          ) : (
            <p className="text-sm font-medium">{quotation.customerNameSnapshot}</p>
          )}
          <DetailRow label="Điện thoại" value={quotation.customerPhoneSnapshot} />
          <DetailRow label="Địa chỉ" value={quotation.customerAddressSnapshot} />
        </CardContent>
      </Card>

      {/* Survey link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <FileTextIcon className="size-3.5" />
            Phiếu khảo sát
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotation.survey ? (
            <Link
              href={`/surveys/${quotation.survey.id}`}
              className="font-mono text-sm text-primary hover:underline"
            >
              {quotation.survey.code}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hạng mục báo giá</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 p-0">
          {(!quotation.items || quotation.items.length === 0) ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Không có dòng hàng</p>
          ) : (
            quotation.items.map((item, idx) => (
              <div key={item.id}>
                {idx > 0 && <Separator />}
                <div className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.productName}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(item.lineTotal)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} ×{' '}
                    {formatCurrency(item.unitPrice)}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Financial summary */}
      <Card>
        <CardContent className="flex flex-col gap-2 pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Tạm tính</span>
            <span className="tabular-nums">{formatCurrency(quotation.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Chiết khấu</span>
            <span className="tabular-nums">-{formatCurrency(quotation.discountAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Thuế</span>
            <span className="tabular-nums">+{formatCurrency(quotation.taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Tổng cộng</span>
            <span className="tabular-nums">{formatCurrency(quotation.grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin thêm</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {quotation.validUntil && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="size-3 shrink-0" />
              <span>Hiệu lực đến: {formatDate(quotation.validUntil)}</span>
            </div>
          )}
          <DetailRow label="Ghi chú" value={quotation.note} />
          <DetailRow label="Tạo bởi" value={quotation.createdByUser?.name} />
          {quotation.updatedByUser && (
            <DetailRow label="Cập nhật bởi" value={quotation.updatedByUser.name} />
          )}
          {quotation.contentLockedAt && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">Nội dung đã khóa</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(quotation.contentLockedAt)}
              </span>
            </div>
          )}
          {quotation.acceptedAt && (
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs text-muted-foreground">Khách đồng ý lúc</Label>
              <span className="text-sm">{formatDateTime(quotation.acceptedAt)}</span>
              {quotation.acceptedByUser && (
                <span className="text-xs text-muted-foreground">
                  ghi nhận bởi {quotation.acceptedByUser.name}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
