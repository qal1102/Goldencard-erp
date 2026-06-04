'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  detailHref: string;
  children: React.ReactNode;
};

/** Returns to detail without leaving print in the history stack (avoids back loops). */
export function PrintReturnButton({ detailHref, children }: Props) {
  const router = useRouter();

  return (
    <Button type="button" variant="outline" onClick={() => router.replace(detailHref)}>
      {children}
    </Button>
  );
}
