'use client';

import { useActionState, useState } from 'react';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ImageUpIcon,
  LoaderIcon,
  Trash2Icon,
} from 'lucide-react';
import { UserAvatar } from '@/components/auth/user-avatar';
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

const MAX_AVATAR_FILE_BYTES = 180 * 1024;

function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Không thể đọc file avatar'));
    reader.readAsDataURL(file);
  });
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl?.trim() ?? '');
  const [avatarError, setAvatarError] = useState('');

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setAvatarError('Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setAvatarError('Ảnh avatar quá lớn. Vui lòng chọn ảnh dưới 180KB.');
      event.target.value = '';
      return;
    }

    try {
      setAvatarUrl(await readAvatarFile(file));
    } catch {
      setAvatarError('Không thể đọc file avatar. Vui lòng thử ảnh khác.');
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-3">
        <UserAvatar name={user.name} avatarUrl={avatarUrl} className="size-16 rounded-xl text-lg" />
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-avatar-file">Ảnh đại diện</Label>
        <input type="hidden" name="avatarUrl" value={avatarUrl} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-10"
            disabled={pending}
            onClick={() => document.getElementById('profile-avatar-file')?.click()}
          >
            <ImageUpIcon className="size-4" />
            Tải ảnh từ máy
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="outline"
              className="min-h-10 text-destructive hover:text-destructive"
              disabled={pending}
              onClick={() => setAvatarUrl('')}
            >
              <Trash2Icon className="size-4" />
              Xóa avatar
            </Button>
          )}
        </div>
        <Input
          id="profile-avatar-file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={pending}
          onChange={handleAvatarChange}
        />
        <p className="text-xs text-muted-foreground">
          Nên dùng ảnh vuông, dưới 180KB. Hệ thống lưu avatar trực tiếp vào hồ sơ nội bộ.
        </p>
        {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
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
