'use client';

import { ExternalLinkIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  className?: string;
};

/** Single navigation path — plain anchor only (no Button + window.open). */
export function OpenPublicWarrantyLink({ href, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), className)}
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLinkIcon className="size-3.5" />
      Mở trang tra cứu
    </a>
  );
}
