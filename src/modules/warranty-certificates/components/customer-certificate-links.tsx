'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWarrantyCertificatesByCustomer } from '../hooks/use-warranty-certificates';
import { WarrantyCertificateStatusBadge } from './warranty-certificate-status-badge';

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  customerId: string;
};

export function CustomerCertificateLinks({ customerId }: Props) {
  const { data: certificates } = useWarrantyCertificatesByCustomer(customerId);

  if (!certificates?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Phiếu bảo hành</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {certificates.map((cert) => (
          <Link
            key={cert.id}
            href={`/warranty-certificates/${cert.id}`}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xs font-semibold text-primary">{cert.code}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDate(cert.warrantyStartAt) ?? '—'}
                {cert.warrantyEndAt ? ` → ${formatDate(cert.warrantyEndAt)}` : ''}
              </span>
            </div>
            <WarrantyCertificateStatusBadge
              status={cert.status}
              warrantyEndAt={cert.warrantyEndAt}
            />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
