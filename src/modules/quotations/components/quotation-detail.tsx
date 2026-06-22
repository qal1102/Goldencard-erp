'use client';

import {
  CalendarIcon,
  EditIcon,
  FileTextIcon,
  LockIcon,
  PrinterIcon,
  UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { BackButton } from '@/components/navigation/back-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { QuotationStatus } from '../schema/quotation.schema';
import type { QuotationDetail as QuotationDetailData } from '../lib/quotation.queries';
import { displayQuotationCode } from '../lib/quotation-display';
import { isQuotationEditable } from '../lib/quotation-resend';
import { useQuotation } from '../hooks/use-quotations';
import { LeadConsultationContextCard } from '@/modules/crm/components/lead-consultation-context-card';
import type { LeadConsultationContext } from '@/modules/crm/schema/lead.schema';
import { SurveyPhotoLinks } from '@/modules/surveys/components/survey-photo-links';
import { QuotationStatusBadge } from './quotation-status-badge';
import { QuotationContractPanel } from '@/modules/contracts/components/quotation-contract-panel';
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

function revisionReason(revision: NonNullable<QuotationDetailData['revisionHistory']>[number]) {
  const latestEdit = revision.editLogs?.[0];
  return (
    revision.responseNote?.trim() ||
    revision.sentNote?.trim() ||
    latestEdit?.note?.trim() ||
    revision.note?.trim() ||
    'Chưa ghi lý do'
  );
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
  const isAccepted = status === 'accepted';
  const canEdit = isQuotationEditable(status) && canWrite;
  const editLogs = quotation.editLogs ?? [];
  const revisionHistory = quotation.revisionHistory ?? [];

  const leadConsultation: LeadConsultationContext | null = quotation.survey?.lead
    ? {
        customerRequirements: quotation.survey.lead.customerRequirements,
        consultationNote: quotation.survey.lead.consultationNote,
        preferredInstallTime: quotation.survey.lead.preferredInstallTime,
        followUpAt: quotation.survey.lead.followUpAt,
        lastCallResult: quotation.survey.lead.lastCallResult,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton fallbackHref="/quotations" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold">
              {displayQuotationCode(quotation.code)}
              <span className="text-muted-foreground"> · bản hiện hành</span>
            </p>
            <QuotationStatusBadge status={status} />
            {isAccepted && (
              <Badge variant="secondary" className="gap-1">
                <LockIcon className="size-3" />
                Đã khóa
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {quotation.customerNameSnapshot}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/quotations/${quotationId}/print`} />}
          >
            <PrinterIcon className="size-3.5" />
            In / Lưu PDF
          </Button>
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
      </div>

      {quotation.needsResend && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Đã chỉnh sửa sau khi gửi — cần xuất và gửi lại
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
            Tải file Excel mới và đánh dấu đã gửi lại cho khách trước khi ghi nhận phản hồi.
          </p>
        </div>
      )}

      {quotation.isSurveyStale && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 dark:border-orange-900 dark:bg-orange-950/30">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
            Dữ liệu khảo sát đã thay đổi sau khi tạo báo giá. Cần kiểm tra lại báo giá.
          </p>
          <p className="mt-0.5 text-xs text-orange-700 dark:text-orange-400">
            Không tự động cập nhật báo giá — hãy rà soát và chỉnh sửa hoặc tạo bản mới nếu cần.
          </p>
        </div>
      )}

      <QuotationWorkflowPanel
        quotation={quotation}
        canWrite={canWrite}
        canApprove={canApprove}
      />

      <QuotationContractPanel
        quotationId={quotationId}
        isAccepted={isAccepted}
        canWrite={canWrite}
      />

      {revisionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lịch sử báo giá</CardTitle>
          </CardHeader>
          <CardContent>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60">
                <span>
                  Bản hiện hành và {Math.max(revisionHistory.length - 1, 0)} lần chỉnh sửa trước đó
                </span>
                <span className="text-xs text-muted-foreground group-open:hidden">
                  Mở lịch sử
                </span>
                <span className="hidden text-xs text-muted-foreground group-open:inline">
                  Thu gọn
                </span>
              </summary>

              <div className="mt-3 overflow-x-auto rounded-lg border">
                <div className="grid min-w-[760px] grid-cols-[120px_130px_130px_150px_1fr_90px] border-b bg-muted/60 px-3 py-2 text-xs font-medium">
                  <span>Lần</span>
                  <span>Trạng thái</span>
                  <span>Tổng tiền</span>
                  <span>Thời gian</span>
                  <span>Lý do / ghi chú</span>
                  <span></span>
                </div>
                {revisionHistory.map((revision) => {
                  const isCurrent = revision.id === quotation.id;
                  return (
                    <div
                      key={revision.id}
                      className="grid min-w-[760px] grid-cols-[120px_130px_130px_150px_1fr_90px] items-start border-b px-3 py-2 text-xs last:border-b-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {isCurrent ? 'Bản hiện hành' : `Lần ${revision.revisionNumber}`}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {displayQuotationCode(revision.code)}
                        </span>
                      </div>
                      <span>
                        <QuotationStatusBadge status={revision.status as QuotationStatus} />
                      </span>
                      <span className="tabular-nums">{formatCurrency(revision.grandTotal)}</span>
                      <span className="text-muted-foreground">
                        {formatDateTime(revision.respondedAt) ||
                          formatDateTime(revision.sentAt) ||
                          formatDateTime(revision.updatedAt) ||
                          formatDateTime(revision.createdAt)}
                      </span>
                      <span className="leading-relaxed text-muted-foreground">
                        {revisionReason(revision)}
                        {revision.respondedByUser?.name && (
                          <span className="block">
                            Ghi nhận bởi {revision.respondedByUser.name}
                          </span>
                        )}
                        {!revision.respondedByUser?.name && revision.createdByUser?.name && (
                          <span className="block">Tạo bởi {revision.createdByUser.name}</span>
                        )}
                      </span>
                      <span>
                        {isCurrent ? (
                          <Badge variant="secondary">Đang xem</Badge>
                        ) : (
                          <Link
                            href={`/quotations/${revision.id}`}
                            className="text-primary hover:underline"
                          >
                            Xem
                          </Link>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {leadConsultation && (
        <LeadConsultationContextCard
          consultation={leadConsultation}
          title="Nhu cầu khách hàng (từ Lead)"
        />
      )}

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
        <CardContent className="flex flex-col gap-3">
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
          {quotation.survey?.photosNote?.trim() && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Link ảnh/tài liệu khảo sát</Label>
              <SurveyPhotoLinks value={quotation.survey.photosNote} />
            </div>
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

      {/* Edit history */}
      {editLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lịch sử chỉnh sửa</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {editLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.editedAt)}
                    {log.editedByUser?.name && ` · ${log.editedByUser.name}`}
                  </span>
                  {log.beforeTotal != null && log.afterTotal != null && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(log.beforeTotal)} → {formatCurrency(log.afterTotal)}
                    </span>
                  )}
                </div>
                <p className="text-sm">{log.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
