'use client';

import { ArrowLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  /** List page to open when there is no in-app history to go back to. */
  fallbackHref: string;
  className?: string;
};

function canUseBrowserBack(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.history.length > 1) return true;
  try {
    const ref = document.referrer;
    if (!ref) return false;
    return new URL(ref).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function BackButton({ fallbackHref, className }: Props) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (canUseBrowserBack()) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }, [fallbackHref, router]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={handleBack}
      aria-label="Quay lại"
    >
      <ArrowLeftIcon className="size-4" />
    </Button>
  );
}
