'use client';

import { useRouter } from 'next/navigation';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const tappableListCardClassName =
  'cursor-pointer transition-colors hover:bg-muted/40 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Prevent card navigation when clicking inner buttons, links, or menus. */
export function stopCardNavigation(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

type TappableListCardProps = {
  href: string;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function TappableListCard({
  href,
  ariaLabel,
  children,
  className,
  contentClassName,
}: TappableListCardProps) {
  const router = useRouter();

  function navigate() {
    router.push(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate();
    }
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={navigate}
      onKeyDown={handleKeyDown}
      className={cn(tappableListCardClassName, className)}
    >
      <CardContent className={cn('p-4', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
