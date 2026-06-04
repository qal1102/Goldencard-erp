'use client';

import { ModuleListError } from '@/components/ui/module-list-error';
import { TappableListCard } from '@/components/ui/tappable-list-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { WarrantyCertificateRow } from '../lib/warranty-certificate.queries';
import { useWarrantyCertificates } from '../hooks/use-warranty-certificates';
import { WarrantyCertificateStatusBadge } from './warranty-certificate-status-badge';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  initialData?: WarrantyCertificateRow[];
  initialError?: string | null;
};

export function WarrantyCertificateList({ initialData, initialError = null }: Props) {
  const {
    data: certificates,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useWarrantyCertificates({}, {
    initialData: initialError ? undefined : initialData,
  });

  const showSkeleton = isPending && !certificates;
  const showError = !certificates && (Boolean(initialError) || isError);
  const errorMessage =
    initialError ??
    (error instanceof Error
      ? error.message
      : 'Không thể tải phiếu bảo hành. Vui lòng thử lại.');

  if (showError) {
    return (
      <ModuleListError
        message={errorMessage}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!certificates?.length) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Chưa có phiếu bảo hành</p>
        <p className="mt-2">
          Phiếu bảo hành được tạo sau bàn giao; khách tra cứu bằng mã QR công khai.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {isFetching && (
        <p className="text-xs text-muted-foreground">Đang cập nhật danh sách...</p>
      )}
      {certificates.map((cert) => (
        <TappableListCard
          key={cert.id}
          href={`/warranty-certificates/${cert.id}`}
          ariaLabel={`Xem phiếu bảo hành ${cert.code}`}
          contentClassName="p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-primary">{cert.code}</span>
                <WarrantyCertificateStatusBadge
                  status={cert.status}
                  warrantyEndAt={cert.warrantyEndAt}
                />
              </div>
              <p className="mt-0.5 truncate text-sm font-medium">
                {cert.customer?.fullName ?? '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Bảo hành: {formatDate(cert.warrantyStartAt)} → {formatDate(cert.warrantyEndAt)}
                {cert.handover && (
                  <>
                    {' '}
                    · BB <span className="font-mono">{cert.handover.code}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </TappableListCard>
      ))}
    </div>
  );
}
