'use client';

import { TappableListCard } from '@/components/ui/tappable-list-card';
import { Skeleton } from '@/components/ui/skeleton';
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

export function WarrantyCertificateList() {
  const { data: certificates, isLoading } = useWarrantyCertificates();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!certificates?.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Chưa có phiếu bảo hành nào.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
