import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    roles: session.user.roles ?? [],
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
