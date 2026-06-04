'use client';

import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';

type Props = Omit<ComponentProps<'a'>, 'href'> & {
  href: string;
};

/** Link-styled control that navigates via replace (avoids stacking create/print in history). */
export function ReplaceLink({ href, onClick, children, ...rest }: Props) {
  const router = useRouter();

  return (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
        router.replace(href);
      }}
    >
      {children}
    </a>
  );
}
