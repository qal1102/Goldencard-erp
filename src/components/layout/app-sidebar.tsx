import { AppBrand } from '@/components/layout/app-brand';
import { NavLinks } from '@/components/layout/nav-links';
import { UserMenu } from '@/components/auth/user-menu';
import type { SessionUser } from '@/components/layout/dashboard-shell';

type AppSidebarProps = {
  user: SessionUser;
};

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-[4.5rem] items-center border-b border-sidebar-border px-5">
        <AppBrand showTagline />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks userRoles={user.roles} isSuperAdmin={user.isSuperAdmin} />
      </div>
      <UserMenu name={user.name} email={user.email} />
    </aside>
  );
}
