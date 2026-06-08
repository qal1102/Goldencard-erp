'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { KeyRoundIcon, LoaderIcon, LogOutIcon } from 'lucide-react';
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

function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      className="w-full justify-start gap-2 shadow-sm"
      disabled={pending}
      aria-live="polite"
    >
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <LogOutIcon className="size-4" />
      )}
      {pending ? 'Đang đăng xuất...' : 'Đăng xuất'}
    </Button>
  );
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

      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          nativeButton={false}
          render={<Link href="/settings/security" />}
        >
          <KeyRoundIcon className="size-4" />
          Đổi mật khẩu
        </Button>

        <form action={signOutAction}>
          <SignOutButton />
        </form>
      </div>
    </div>
  );
}
