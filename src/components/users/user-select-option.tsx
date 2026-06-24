'use client';

import { UserAvatar } from '@/components/auth/user-avatar';

export type UserSelectOptionData = {
  id: string;
  name: string;
  email?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
};

type UserSelectOptionProps = {
  user: UserSelectOptionData;
  description?: string | null;
};

export function UserSelectOption({ user, description }: UserSelectOptionProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-7" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate leading-tight">{user.name}</span>
        {(description || user.jobTitle || user.email) && (
          <span className="truncate text-xs leading-tight text-muted-foreground">
            {description ?? user.jobTitle ?? user.email}
          </span>
        )}
      </span>
    </span>
  );
}
