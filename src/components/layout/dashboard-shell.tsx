'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { getNavItemByHref } from '@/lib/navigation/modules';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  roles: string[];
};

type DashboardShellProps = {
  children: React.ReactNode;
  user: SessionUser;
};

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const currentNav = getNavItemByHref(pathname);
  const title = currentNav?.label ?? 'Tổng quan';

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader title={title} user={user} />
        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
