'use client';

import { useActionState } from 'react';
import { AlertCircleIcon, LoaderIcon } from 'lucide-react';
import { changePasswordAction } from '@/lib/auth/change-password.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Mật khẩu hiện tại *</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">Mật khẩu mới *</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">
          Tối thiểu 8 ký tự, có ít nhất một chữ cái và một chữ số.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới *</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state?.error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Button type="submit" className="min-h-11 w-full" disabled={pending}>
        {pending ? (
          <>
            <LoaderIcon className="size-4 animate-spin" />
            Đang lưu...
          </>
        ) : (
          'Đổi mật khẩu'
        )}
      </Button>
    </form>
  );
}
