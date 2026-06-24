import { getCurrentUser, verifySession } from '@/lib/auth/dal';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const currentUser = await getCurrentUser(session.user.id);

  const user = {
    id: session.user.id,
    name: currentUser?.name ?? session.user.name,
    email: currentUser?.email ?? session.user.email,
    avatarUrl: currentUser?.avatarUrl ?? null,
    roles: session.user.roles ?? [],
    isSuperAdmin: currentUser?.isSuperAdmin ?? session.user.isSuperAdmin ?? false,
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
