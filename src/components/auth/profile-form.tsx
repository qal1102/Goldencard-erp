'use client';

import { useActionState } from 'react';
import { AlertCircleIcon, CheckCircle2Icon, LoaderIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfileAction } from '@/lib/auth/profile.actions';

type ProfileFormProps = {
  user: {
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  const avatarUrl = user.avatarUrl?.trim();

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={user.name}
            className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            {getInitials(user.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-name">Tên hiển thị *</Label>
          <Input
            id="profile-name"
            name="name"
            defaultValue={user.name}
            autoComplete="name"
            required
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-phone">Số điện thoại</Label>
          <Input
            id="profile-phone"
            name="phone"
            defaultValue={user.phone ?? ''}
            autoComplete="tel"
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-avatar">Avatar URL</Label>
        <Input
          id="profile-avatar"
          name="avatarUrl"
          type="url"
          defaultValue={user.avatarUrl ?? ''}
          placeholder="https://..."
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Dán link ảnh đại diện nội bộ. Có thể để trống để dùng chữ viết tắt.
        </p>
      </div>

      {state?.success === false && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.success === true && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2Icon className="size-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <Button type="submit" className="min-h-11 w-full sm:w-fit" disabled={pending}>
        {pending ? (
          <>
            <LoaderIcon className="size-4 animate-spin" />
            Đang lưu...
          </>
        ) : (
          'Lưu hồ sơ'
        )}
      </Button>
    </form>
  );
}
