'use client';

import { useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { AppBrand } from '@/components/layout/app-brand';
import { NavLinks } from '@/components/layout/nav-links';
import { UserMenu } from '@/components/auth/user-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { SessionUser } from '@/components/layout/dashboard-shell';

type AppHeaderProps = {
  title: string;
  user: SessionUser;
};

export function AppHeader({ title, user }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="flex min-h-[4.5rem] items-center gap-3 px-4 lg:px-6">
        <Button
          variant="outline"
          size="icon-lg"
          className="size-12 shrink-0 rounded-xl lg:hidden"
          aria-label="Mở menu điều hướng"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon className="size-5" />
        </Button>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-[min(100vw,20rem)] gap-0 p-0">
            <SheetHeader className="border-b border-border px-5 py-5 text-left">
              <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
              <AppBrand showTagline />
            </SheetHeader>
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks
          userRoles={user.roles}
          isSuperAdmin={user.isSuperAdmin}
          onNavigate={() => setMenuOpen(false)}
        />
              </div>
              <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
            Trang hiện tại
          </p>
          <p className="truncate text-lg font-semibold tracking-tight text-foreground lg:text-2xl">
            {title}
          </p>
        </div>

        <NotificationBell />
      </div>
    </header>
  );
}
