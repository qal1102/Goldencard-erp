'use client';

import { BackButton } from '@/components/navigation/back-button';

type Props = {
  href: string;
};

export function QuotationFormBack({ href }: Props) {
  return <BackButton fallbackHref={href} />;
}
