'use client';

import { LogOutIcon } from 'lucide-react';
import { signOutAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';

type UserMenuProps = {
  name?: string | null;
  email?: string | null;
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserMenu({ name, email }: UserMenuProps) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {getInitials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight text-foreground">
            {name ?? 'Người dùng'}
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {email ?? ''}
          </p>
        </div>
      </div>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
        >
          <LogOutIcon className="size-4" />
          Đăng xuất
        </Button>
      </form>
    </div>
  );
}
