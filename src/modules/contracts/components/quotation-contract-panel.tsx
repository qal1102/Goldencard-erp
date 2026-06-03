'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FilePlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useContractByQuotation,
  useCreateContractFromQuotation,
} from '../hooks/use-contracts';

type Props = {
  quotationId: string;
  isAccepted: boolean;
  canWrite: boolean;
};

export function QuotationContractPanel({ quotationId, isAccepted, canWrite }: Props) {
  const { data: contract, isLoading } = useContractByQuotation(
    quotationId,
    isAccepted,
  );
  const createContract = useCreateContractFromQuotation();
  const [createError, setCreateError] = useState<string | null>(null);

  if (!isAccepted) return null;

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (contract) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium">Hợp đồng</p>
            <p className="font-mono text-xs text-muted-foreground">{contract.code}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/contracts/${contract.id}`}>Xem hợp đồng</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  if (!canWrite) return null;

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <p className="text-sm text-muted-foreground">
          Tạo hợp đồng nháp từ báo giá đã được khách đồng ý
        </p>
        <Button
          size="sm"
          disabled={createContract.isPending}
          onClick={() => {
            setCreateError(null);
            createContract.mutate(
              { quotationId },
              {
                onSuccess: (result) => {
                  if (!result.success) setCreateError(result.error);
                },
              },
            );
          }}
        >
          <FilePlusIcon className="size-3.5" />
          Tạo hợp đồng
        </Button>
      </CardContent>
      {createError && (
        <p className="px-4 pb-3 text-sm text-destructive">{createError}</p>
      )}
    </Card>
  );
}
