import { verifySession } from '@/lib/auth/dal';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    roles: session.user.roles ?? [],
    isSuperAdmin: session.user.isSuperAdmin ?? false,
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
