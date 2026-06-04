'use client';

import { ArrowLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  /** Target route for the in-app back action (module list, source detail, etc.). */
  fallbackHref: string;
  className?: string;
  /**
   * `stable` (default): always `router.replace(fallbackHref)` — predictable on mobile.
   * `history`: opt-in browser back; falls back to replace when history is empty.
   */
  variant?: 'stable' | 'history';
};

export function BackButton({ fallbackHref, className, variant = 'stable' }: Props) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (variant === 'history' && typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  }, [fallbackHref, router, variant]);

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
