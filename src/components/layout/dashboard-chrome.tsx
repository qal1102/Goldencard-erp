'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { getNavItemByHref } from '@/lib/navigation/modules';
import type { SessionUser } from '@/components/layout/dashboard-shell';

type DashboardChromeProps = {
  children: React.ReactNode;
  user: SessionUser;
};

export function DashboardChrome({ children, user }: DashboardChromeProps) {
  const pathname = usePathname();
  const currentNav = getNavItemByHref(pathname);
  const title = currentNav?.label ?? 'Tổng quan';

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader title={title} user={user} />
      <main className="flex-1 px-4 py-5 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
