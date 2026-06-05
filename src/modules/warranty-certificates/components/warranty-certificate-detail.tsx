'use client';

import Link from 'next/link';
import { PrinterIcon, QrCodeIcon } from 'lucide-react';
import { BackButton } from '@/components/navigation/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getPublicWarrantyCheckUrl } from '../lib/public-url';
import { resolveSupportPhone } from '../lib/support-phone';
import { useWarrantyCertificate } from '../hooks/use-warranty-certificates';
import { CopyPublicLinkButton } from './copy-public-link-button';
import { OpenPublicWarrantyLink } from './open-public-warranty-link';
import { WarrantyCertificateStatusBadge } from './warranty-certificate-status-badge';

function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTimeFull(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{value}</span>
    </div>
  );
}

type Props = {
  certificateId: string;
};

export function WarrantyCertificateDetail({ certificateId }: Props) {
  const { data: certificate, isLoading } = useWarrantyCertificate(certificateId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Không tìm thấy phiếu bảo hành
      </div>
    );
  }

  const publicUrl = getPublicWarrantyCheckUrl(certificate.publicToken);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/warranty-certificates" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold">{certificate.code}</h1>
            <WarrantyCertificateStatusBadge
              status={certificate.status}
              warrantyEndAt={certificate.warrantyEndAt}
            />
          </div>
          {certificate.customer && (
            <Link
              href={`/crm/customers/${certificate.customer.id}`}
              className="mt-1 block text-sm font-medium text-primary hover:underline"
            >
              {certificate.customer.fullName}
            </Link>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/warranty-certificates/${certificateId}/print`} />}
            >
              <PrinterIcon className="size-3.5" />
              In / Lưu PDF
            </Button>
            <CopyPublicLinkButton url={publicUrl} />
            <OpenPublicWarrantyLink href={publicUrl} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tra cứu công khai (QR)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <QrCodeIcon className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs">
              Dùng mã QR này để in/dán tại hệ thống của khách. Khi quét mã, khách có thể xem thông
              tin bảo hành, gọi hotline hoặc gửi yêu cầu hỗ trợ. Liên kết dùng mã bảo mật, không lộ
              mã nội bộ ERP.
            </p>
          </div>
          <p className="break-all font-mono text-xs text-foreground">{publicUrl}</p>
          {certificate.qrRequestStats && (
            <div className="mt-2 flex flex-col gap-1 border-t pt-2 text-xs text-muted-foreground">
              <span>Số yêu cầu từ QR: {certificate.qrRequestStats.totalFromQr}</span>
              <span>Yêu cầu đang mở: {certificate.qrRequestStats.openFromQr}</span>
              {certificate.qrRequestStats.lastSubmittedAt && (
                <span>
                  Lần gửi gần nhất:{' '}
                  {formatDateTimeFull(certificate.qrRequestStats.lastSubmittedAt)}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thời hạn &amp; hỗ trợ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DetailRow label="Bắt đầu bảo hành" value={formatDateTime(certificate.warrantyStartAt)} />
          <DetailRow label="Kết thúc bảo hành" value={formatDateTime(certificate.warrantyEndAt)} />
          <DetailRow
            label="Hotline hỗ trợ"
            value={resolveSupportPhone(certificate.supportPhone)}
          />
          {certificate.warrantyTerms && (
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs text-muted-foreground">Điều khoản bảo hành</Label>
              <p className="whitespace-pre-wrap text-sm">{certificate.warrantyTerms}</p>
            </div>
          )}
          {certificate.note && <DetailRow label="Ghi chú nội bộ" value={certificate.note} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Liên kết dự án (nội bộ)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {certificate.handover && (
            <div>
              <Label className="text-xs text-muted-foreground">Biên bản bàn giao</Label>
              <Link
                href={`/handovers/${certificate.handover.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {certificate.handover.code}
              </Link>
            </div>
          )}
          {certificate.survey && (
            <div>
              <Label className="text-xs text-muted-foreground">Khảo sát</Label>
              <Link
                href={`/surveys/${certificate.survey.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {certificate.survey.code}
              </Link>
            </div>
          )}
          {certificate.quotation && (
            <div>
              <Label className="text-xs text-muted-foreground">Báo giá</Label>
              <Link
                href={`/quotations/${certificate.quotation.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {certificate.quotation.code}
              </Link>
            </div>
          )}
          {certificate.contract && (
            <div>
              <Label className="text-xs text-muted-foreground">Hợp đồng</Label>
              <Link
                href={`/contracts/${certificate.contract.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {certificate.contract.code}
              </Link>
            </div>
          )}
          {certificate.workOrder && (
            <div>
              <Label className="text-xs text-muted-foreground">Lệnh thi công</Label>
              <Link
                href={`/work-orders/${certificate.workOrder.id}`}
                className="block font-mono text-primary hover:underline"
              >
                {certificate.workOrder.code}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
