import { AppSidebar } from '@/components/layout/app-sidebar';
import { DashboardChrome } from '@/components/layout/dashboard-chrome';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
  roles: string[];
  isSuperAdmin: boolean;
};

type DashboardShellProps = {
  children: React.ReactNode;
  user: SessionUser;
};

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar user={user} />
      <DashboardChrome user={user}>{children}</DashboardChrome>
    </div>
  );
}
