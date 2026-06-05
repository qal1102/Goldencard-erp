'use client';

import { useActionState, useEffect, useState } from 'react';
import { AlertCircleIcon, LoaderIcon } from 'lucide-react';
import { loginAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SLOW_LOGIN_MS = 3_000;
const LOGIN_TIMEOUT_MS = 10_000;

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!pending) return;

    const slowTimer = window.setTimeout(() => setShowSlowMessage(true), SLOW_LOGIN_MS);
    const timeoutTimer = window.setTimeout(() => setTimedOut(true), LOGIN_TIMEOUT_MS);

    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [pending]);

  function handleSubmit() {
    setShowSlowMessage(false);
    setTimedOut(false);
  }

  const displayError =
    state?.error ?? (pending && timedOut ? 'Đăng nhập quá lâu. Vui lòng thử lại.' : undefined);

  return (
    <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="admin@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {showSlowMessage && pending && !displayError ? (
        <p className="text-center text-sm text-muted-foreground">
          Đang kết nối hệ thống, vui lòng chờ...
        </p>
      ) : null}

      {displayError ? (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          'Đăng nhập'
        )}
      </Button>
    </form>
  );
}
