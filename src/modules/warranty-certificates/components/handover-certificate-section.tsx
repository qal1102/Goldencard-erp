'use client';

import Link from 'next/link';
import { FileBadgeIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCreateWarrantyCertificateFromHandover,
  useWarrantyCertificateByHandover,
} from '../hooks/use-warranty-certificates';

type Props = {
  handoverId: string;
  canWrite: boolean;
  showCreate: boolean;
};

export function HandoverCertificateSection({ handoverId, canWrite, showCreate }: Props) {
  const { data: certificate } = useWarrantyCertificateByHandover(handoverId, showCreate);
  const createCertificate = useCreateWarrantyCertificateFromHandover();
  const [error, setError] = useState<string | null>(null);

  if (!showCreate) return null;

  async function handleCreate() {
    setError(null);
    const result = await createCertificate.mutateAsync(handoverId);
    if (!result.success) setError(result.error);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Phiếu bảo hành khách hàng</CardTitle>
        {canWrite && !certificate && (
          <Button
            size="sm"
            disabled={createCertificate.isPending}
            onClick={handleCreate}
          >
            <PlusIcon className="size-3.5" />
            {createCertificate.isPending ? 'Đang tạo...' : 'Tạo phiếu bảo hành'}
          </Button>
        )}
        {certificate && (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/warranty-certificates/${certificate.id}`} />}
          >
            <FileBadgeIcon className="size-3.5" />
            Xem phiếu bảo hành
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!certificate && (
          <p className="text-xs text-muted-foreground">
            Tạo phiếu bảo hành có mã QR để khách tra cứu và gửi yêu cầu hỗ trợ sau bàn giao.
          </p>
        )}
        {certificate && (
          <p className="text-xs text-muted-foreground">
            Đã phát hành{' '}
            <span className="font-mono font-medium text-foreground">{certificate.code}</span>
          </p>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
